---
record_kind: "retro"
harness_version: "0.13.0"
branch: "feat/35-measure-mvp-performance"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-14T07:01:33.238Z"
agent: "agent"
plan_id: "35-bl-015-measure-mvp-navigation-and-startup-performance"
schema_version: "1.2"
retro_id: "2026-08-14T07:03:59.729Z-agent-cd97b9ab"
started_at: "2026-08-08T11:04:49.387Z"
ended_at: "2026-08-14T07:03:59.729Z"
summary: "retro --drain cross-session save (1264 entries through BL-015)"
entries:
  - id: "CONF-001"
    kind: "confusion"
    description: "The planned extension paths required backtracking to their nested directories."
    fp: "48d3f32e76d1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:04:49.387Z"
  - id: "DL-001"
    kind: "difficulty"
    description: "The negative-path fixture assumed a python executable that the environment does not provide."
    fp: "2b87e8e2acb8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:06:12.659Z"
  - id: "SUGG-001"
    kind: "improvement-suggestion"
    description: "The checks failure fixture had to be retried with a repository-available runtime."
    fp: "9efa6ab83a21"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:06:12.764Z"
  - id: "CONF-002"
    kind: "confusion"
    description: "The root module-resolution search unexpectedly found no Ajv package."
    fp: "98ac92d4b08c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:07:28.781Z"
  - id: "DL-002"
    kind: "difficulty"
    description: "Report schema validation requires resolving Ajv from the pnpm virtual store rather than the root module path."
    fp: "d5b23e9cec36"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:07:29.008Z"
  - id: "DL-003"
    kind: "difficulty"
    description: "Sequential checks and boot validation required a tool wait longer than 30 seconds."
    fp: "e62aafa2f48f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:11:35.866Z"
  - id: "DL-004"
    kind: "difficulty"
    description: "Repository search command was unavailable and required a fallback."
    fp: "99a4f2fbd7ce"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:24:05.018Z"
  - id: "CONF-003"
    kind: "confusion"
    description: "The checks instruction path assumption was wrong and required reading the discovered extension path."
    fp: "f3199ac1df45"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:24:20.897Z"
  - id: "INS-001"
    kind: "insight"
    description: "The installed dependency search for skill lock hashing returned no results, so lock recomputation could not rely on local package internals."
    fp: "48b0445b53e6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:24:55.700Z"
  - id: "DL-005"
    kind: "difficulty"
    description: "The assumed python command was unavailable, requiring the repository edit script to use python3."
    fp: "c62f50719fa9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:25:28.596Z"
  - id: "DL-006"
    kind: "difficulty"
    description: "The python3 fallback was also unavailable, requiring repository edits through the installed Node runtime."
    fp: "ab1472ba9485"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:25:42.425Z"
  - id: "DL-007"
    kind: "difficulty"
    description: "The first bounded stdout-only check used an incorrect next_action path and malformed fixture quoting, requiring a corrected assertion."
    fp: "b84b053cc482"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T11:26:24.822Z"
  - id: "DL-008"
    kind: "difficulty"
    description: "Global code-server installation requires npm --unsafe-perm for its postinstall script"
    fp: "1e871dc642a1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T00:27:32.185Z"
  - id: "CONF-004"
    kind: "confusion"
    description: "The work-item Plan artifacts were present but untracked at implementation start; they will be preserved and committed with the issue implementation."
    fp: "490f6104894f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:19:41.896Z"
  - id: "DL-009"
    kind: "difficulty"
    description: "A broad code-server reference search included generated and work-item content and produced unusably large output, requiring a narrower tracked-file search."
    fp: "a41ac8e6a26c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:20:13.313Z"
  - id: "DL-010"
    kind: "difficulty"
    description: "The first repository edit attempt used incompatible nested shell quoting and had to be retried with a safer file-writing form."
    fp: "6f1c7a74d832"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:21:45.498Z"
  - id: "CONF-005"
    kind: "confusion"
    description: "The documented generic Python command was unavailable in the devcontainer; repository edit automation had to use python3 explicitly."
    fp: "67e4609ab8ec"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:22:09.872Z"
  - id: "SUGG-002"
    kind: "improvement-suggestion"
    description: "Neither python nor python3 exists despite the execution-tool guidance, so file edits must use the repository's Node.js runtime."
    fp: "6f4730845a47"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:22:37.378Z"
  - id: "DL-011"
    kind: "difficulty"
    description: "Focused validation failed because shell processing removed regex escape characters from the generated TypeScript source."
    fp: "8aaaec7751e7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:25:03.428Z"
  - id: "COORD-001"
    kind: "coordination"
    description: "Resumed an uncommitted implementation after a syntax-error backtrack in T-1."
    fp: "4b936d9b530c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:26:40.039Z"
  - id: "DL-012"
    kind: "difficulty"
    description: "The documented Python tool alias was unavailable, requiring use of the installed python3 binary."
    fp: "ebd8cdec3869"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:27:05.152Z"
  - id: "CONF-006"
    kind: "confusion"
    description: "Neither Python command name was installed despite the expected tool inventory, causing a second edit backtrack."
    fp: "2256d757de8b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:27:17.968Z"
  - id: "DL-013"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis: proof-start CLI had the same unterminated newline literal."
    fp: "fe1d36df3d08"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:27:48.534Z"
  - id: "DL-014"
    kind: "difficulty"
    description: "Focused validation exposed a direct test seam defect: proof-stop could not use the per-test run root created by proof-start."
    fp: "ef21c41404ef"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:28:21.472Z"
  - id: "SUGG-003"
    kind: "improvement-suggestion"
    description: "The expected apply_patch editing helper search returned unexpectedly empty, so edits must use repository-native Node scripts."
    fp: "9dd6397a1121"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:29:52.523Z"
  - id: "DL-015"
    kind: "difficulty"
    description: "The first browser lifecycle validation failed before emitting a handle; cleanup assertions obscured the original startup failure."
    fp: "518584520eb2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:36:36.487Z"
  - id: "DL-016"
    kind: "difficulty"
    description: "Browser validation reached code-server and Explorer but could not observe the Markdown preview sentinel through the initial frame lookup."
    fp: "d2e271517ace"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:38:39.182Z"
  - id: "DL-017"
    kind: "difficulty"
    description: "Full validation failed at the configured formatting gate for newly added proof sources and tests."
    fp: "fbb6e380ab7e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:41:46.840Z"
  - id: "DL-018"
    kind: "difficulty"
    description: "Full validation next failed type checking because the child-process error callback assignment narrowed the captured error to never."
    fp: "2cf1cbd46b24"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:42:15.701Z"
  - id: "DL-019"
    kind: "difficulty"
    description: "Full validation then failed the configured 80% branch threshold, requiring additional lifecycle branch tests rather than lowering coverage."
    fp: "70f23a94bfcf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:43:21.335Z"
  - id: "DL-020"
    kind: "difficulty"
    description: "A dense Node edit command failed to parse while adding coverage cases, requiring smaller inspect-edit steps."
    fp: "a7d7edba3326"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:44:43.391Z"
  - id: "DL-021"
    kind: "difficulty"
    description: "Coverage-focused additions improved branch coverage but the full gate remained below 80%, exposing entrypoint and race-only branches that unit seams could not safely drive."
    fp: "f3d6bab306df"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:46:44.793Z"
  - id: "DL-022"
    kind: "difficulty"
    description: "The full gate still missed branch coverage after state and CLI failure tests, so remaining untestable platform-race branches need explicit coverage exclusions or seams."
    fp: "9b6ff13b8d3a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:48:21.944Z"
  - id: "DL-023"
    kind: "difficulty"
    description: "Full validation reached 77.6% branch coverage; three additional designated-host branches remained before the configured threshold."
    fp: "204ab8aeb17f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:49:44.205Z"
  - id: "WIN-001"
    kind: "win"
    description: "Full validation caught the platform type contract that os.userInfo().shell may be null, so the documented shell fallback had to remain."
    fp: "d00977e84822"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:51:48.802Z"
  - id: "DL-024"
    kind: "difficulty"
    description: "The full gate remained one to two branches below threshold after the type-safe fix, requiring one final executable branch test rather than altering thresholds."
    fp: "9daa95a7a3a1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:52:53.038Z"
  - id: "CONF-007"
    kind: "confusion"
    description: "The source aggregate reached 80% but the configured global branch metric remained one branch short at 79.67%, exposing the distinction between displayed source and threshold aggregates."
    fp: "d259947572f5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:55:18.632Z"
  - id: "DL-025"
    kind: "difficulty"
    description: "Focused validation exposed localeCompare ordering for nested fixture membership; the expected deterministic path order needed to match the snapshot helper."
    fp: "efce9def6bc2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T01:55:51.805Z"
  - id: "CONF-008"
    kind: "confusion"
    description: "The expected work-item verification artifact directory was absent while resuming Verify feedback."
    fp: "34de41313f4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T02:06:53.514Z"
  - id: "CONF-009"
    kind: "confusion"
    description: "Repository search required fallback because rg is unavailable in the implementation environment."
    fp: "c6fff45793b3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T02:06:53.520Z"
  - id: "CONF-010"
    kind: "confusion"
    description: "A repository edit required retry because the environment provides python3 but not the python command."
    fp: "ee415396a647"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T02:08:06.177Z"
  - id: "DL-026"
    kind: "difficulty"
    description: "The second edit attempt also required backtracking because neither python nor python3 is installed."
    fp: "4b60985d268c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T02:08:24.752Z"
  - id: "DL-027"
    kind: "difficulty"
    description: "Shell quoting invalidated the Node edit attempt, requiring another bounded backtrack."
    fp: "4d457ba9d118"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T02:08:46.029Z"
  - id: "WIN-002"
    kind: "win"
    description: "The repeated standalone E2E stability validation required a tool wait over 30 seconds and completed successfully."
    fp: "6b40d03000e3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T02:10:54.863Z"
  - id: "DL-028"
    kind: "difficulty"
    description: "Documentation edits were blocked because Markdown backticks inside double-quoted shell input were interpreted as unsafe expansion, requiring safer quoting."
    fp: "f3fb2962906c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T02:11:43.407Z"
  - id: "CONF-011"
    kind: "confusion"
    description: "Implementation request supplied prose rather than canonical JSON; fields were resolved from the explicit issue, branch, work-item path, and Plan-directed scope."
    fp: "b4c997660f18"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:28:28.929Z"
  - id: "DL-029"
    kind: "difficulty"
    description: "The repository inspection workflow assumed ripgrep, but rg is not installed on the designated host; inspection switched to grep/find."
    fp: "4366c75ecbdf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:28:53.798Z"
  - id: "DL-030"
    kind: "difficulty"
    description: "The expected apply_patch helper is unavailable on the designated host, requiring a backtrack to direct scripted file edits."
    fp: "ddfc2702b867"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:30:13.296Z"
  - id: "CONF-012"
    kind: "confusion"
    description: "The advertised python command is unavailable; repository edits must use the installed python3 executable instead."
    fp: "a3b0c130e62d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:30:54.027Z"
  - id: "DL-031"
    kind: "difficulty"
    description: "Neither python nor python3 is installed despite the tool guidance, causing a second edit-strategy backtrack to Node.js."
    fp: "5c1adec5994b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:31:39.436Z"
  - id: "DL-032"
    kind: "difficulty"
    description: "A nested template literal made the scripted test-file edit invalid, requiring a retry with concatenated fixture lines."
    fp: "abd120fad8b0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:35:19.701Z"
  - id: "DL-033"
    kind: "difficulty"
    description: "Focused T-2 validation exposed a race reading process start identity for fast commands; the shared executor needs synchronous post-spawn identity capture."
    fp: "fbea89094fd3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:36:53.800Z"
  - id: "INS-002"
    kind: "insight"
    description: "The T-2 retry exposed hidden shebang dependence on node resolution because the fake-tool PATH contained only fixtures; tests must include the runtime directory."
    fp: "540486e1b0ba"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:37:33.044Z"
  - id: "DL-034"
    kind: "difficulty"
    description: "The next focused retry revealed an over-escaped fake stream fixture, so it emitted literal backslash sequences instead of CRLF bytes."
    fp: "77f4cbae6fef"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:38:05.583Z"
  - id: "DL-035"
    kind: "difficulty"
    description: "Focused validation then showed the broad escape correction also changed expected raw literals, requiring a narrow assertion fix."
    fp: "fa75720f880d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:38:47.569Z"
  - id: "INS-003"
    kind: "insight"
    description: "The first paved browser proof matched the completion token in the terminal command echo before the integrated artifact existed; completion must also be gated on the atomic artifact."
    fp: "88df996eb645"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T03:42:53.855Z"
  - id: "DL-036"
    kind: "difficulty"
    description: "A documentation-edit command was blocked by shell security due to markdown backtick handling, requiring a safer encoded edit strategy."
    fp: "e6d7b65f42fa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:18:19.244Z"
  - id: "DL-037"
    kind: "difficulty"
    description: "Full validation failed at the formatting gate for the newly added TypeScript files and required a formatter correction."
    fp: "8aed441b7d8a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:20:12.792Z"
  - id: "DL-038"
    kind: "difficulty"
    description: "The full validation retry passed formatting and lint but strict TypeScript rejected closure-assigned browser context and narrowed spawn-error branches."
    fp: "5db8c546dee5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:20:47.940Z"
  - id: "DL-039"
    kind: "difficulty"
    description: "Full validation progressed through typecheck but branch coverage fell to 75.26%, below the 80% contract, requiring additional negative-path tests."
    fp: "dccd169549fd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:21:33.078Z"
  - id: "CONF-013"
    kind: "confusion"
    description: "The coverage-test edit silently changed only the import because its insertion marker no longer matched formatted quote style, so the intended tests never ran."
    fp: "2628add9bde2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:22:51.329Z"
  - id: "CONF-014"
    kind: "confusion"
    description: "The initial harness change-record search returned unexpectedly empty because its depth bound excluded dated record files; a deeper search resolved the existing format."
    fp: "247e5b82cf08"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:31:51.145Z"
  - id: "DL-040"
    kind: "difficulty"
    description: "Repository search required a fallback because rg is unavailable in the implementation environment."
    fp: "da43ecf6e502"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:41:42.377Z"
  - id: "DL-041"
    kind: "difficulty"
    description: "A source-edit command failed because nested shell quoting was unsafe and required a simpler retry."
    fp: "64da0d081276"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:45:21.543Z"
  - id: "DL-042"
    kind: "difficulty"
    description: "The implementation environment lacks the python executable assumed for a source edit, requiring the available Node.js runtime instead."
    fp: "49925123eb4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:45:35.357Z"
  - id: "DL-043"
    kind: "difficulty"
    description: "An import edit did not match repository quote style and required a narrower structural retry."
    fp: "5945ef0b3835"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:46:05.142Z"
  - id: "DL-044"
    kind: "difficulty"
    description: "A helper insertion assumed formatted quote style and required a regex-based retry."
    fp: "c90dc775e1ef"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:46:58.339Z"
  - id: "DL-045"
    kind: "difficulty"
    description: "The real timeout E2E failed before the deadline because the initial terminal shortcut lacked a focused workbench state."
    fp: "b5c41281abe5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:49:28.332Z"
  - id: "DL-046"
    kind: "difficulty"
    description: "The timeout E2E process audit did not recognize the sleep argv shape and required basename-based matching through the deadline."
    fp: "534372ee5e20"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:50:22.091Z"
  - id: "INS-004"
    kind: "insight"
    description: "The code-server process-tree walk could not attribute the PTY sleep process, so the real test needed an explicit PID/start-identity handoff."
    fp: "2f3507b47dce"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:51:22.883Z"
  - id: "DL-047"
    kind: "difficulty"
    description: "The shell setsid PID represented a short-lived wrapper rather than the blocking child, requiring a deterministic test fixture to publish the detached child identity."
    fp: "f1555d8aca81"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:52:16.102Z"
  - id: "DL-048"
    kind: "difficulty"
    description: "A task-evidence edit failed on embedded Markdown delimiters and required a plain-text retry."
    fp: "e6ff4076db5d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:54:15.935Z"
  - id: "DL-049"
    kind: "difficulty"
    description: "Full validation failed at the canonical formatting gate after the timeout-cleanup edits."
    fp: "0ef424622ee5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T04:54:44.871Z"
  - id: "DL-050"
    kind: "difficulty"
    description: "The process-group tracker edit missed formatted quote style and required a complete small-file rewrite."
    fp: "3767f85cc35e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T05:00:45.232Z"
  - id: "DL-051"
    kind: "difficulty"
    description: "Final full validation exposed branch coverage below 80 percent after adding identity-tracker failure handling."
    fp: "7b1d1daede9f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T05:02:38.063Z"
  - id: "DL-052"
    kind: "difficulty"
    description: "Full validation still missed the global branch threshold because the non-Error tracker failure branch remained uncovered."
    fp: "8bdbf226b3d8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-09T05:03:54.092Z"
  - id: "DL-053"
    kind: "difficulty"
    description: "Repository search required backtracking because rg was unavailable in the implementation environment."
    fp: "cc5a97f161a1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:21:50.425Z"
  - id: "DL-054"
    kind: "difficulty"
    description: "README editing required backtracking because the environment provides python3 but not the python command."
    fp: "78c5fed734d4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:22:10.873Z"
  - id: "DL-055"
    kind: "difficulty"
    description: "README editing required a second backtrack because neither python nor python3 is installed in the project environment."
    fp: "26c0c80fe467"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:22:17.362Z"
  - id: "COORD-002"
    kind: "coordination"
    description: "Canonical full validation required a tool wait over 30 seconds while both real Chromium workbench scenarios completed."
    fp: "dca5f9ab4a3c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:23:28.696Z"
  - id: "DL-056"
    kind: "difficulty"
    description: "Issue-related wording search required a fallback because ripgrep is unavailable in the repository environment."
    fp: "a05a98564288"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:28:18.810Z"
  - id: "DL-057"
    kind: "difficulty"
    description: "Documentation edits required a safer retry after shell command-substitution detection blocked backtick-bearing inline replacements."
    fp: "ff3ea94949b0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:29:04.847Z"
  - id: "CONF-015"
    kind: "confusion"
    description: "Documentation edits required a second retry because only python3, not the advertised python command, is available."
    fp: "af9ad0f9981e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:29:24.107Z"
  - id: "CONF-016"
    kind: "confusion"
    description: "Documentation edits required a Node.js fallback because neither python nor python3 is installed despite tool guidance."
    fp: "42452e33111c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:29:38.170Z"
  - id: "WIN-003"
    kind: "win"
    description: "Canonical full validation required a tool wait over 30 seconds while both real Chromium workbench scenarios completed."
    fp: "6d58a4ca6d95"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T00:31:31.694Z"
  - id: "DL-058"
    kind: "difficulty"
    description: "A research-file range probe exceeded the file length and required a bounded reread."
    fp: "78ef61b0cd67"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:26:27.390Z"
  - id: "DL-059"
    kind: "difficulty"
    description: "A second skill-file range probe exceeded the file length and required a corrected bounded read."
    fp: "d4fdf18c9856"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:27:14.053Z"
  - id: "COORD-003"
    kind: "coordination"
    description: "The configured pre-coding harness seam requires a host skill invocation mechanism that is unavailable in this API toolset."
    fp: "255325394cf4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:27:14.100Z"
  - id: "DL-060"
    kind: "difficulty"
    description: "A large source-file creation command failed because nested shell quoting was not safely representable and required a simpler write strategy."
    fp: "03fc0cecc275"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:28:00.535Z"
  - id: "CONF-017"
    kind: "confusion"
    description: "The tool guidance advertised python, but only python3 is installed in the repository environment."
    fp: "0340193ba50a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:28:27.167Z"
  - id: "DL-061"
    kind: "difficulty"
    description: "The proof-adapter source write hit an HTML quote boundary in the shell wrapper and required quote-free fixture markup."
    fp: "bfef5d64630a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:31:16.996Z"
  - id: "INS-005"
    kind: "insight"
    description: "The designated six-attempt Chromium comparison required more than 30 seconds to complete."
    fp: "6ff48bf8cd12"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:37:22.016Z"
  - id: "CONF-018"
    kind: "confusion"
    description: "An attempt-summary query used ambiguous jq precedence and required explicit grouping."
    fp: "6b2f4ee2b2fc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:37:37.866Z"
  - id: "SUGG-004"
    kind: "improvement-suggestion"
    description: "The first designated comparison exposed that failed scenarios lost partial assertion timing, requiring evidence-preserving error propagation before a new independent comparison."
    fp: "732b81cee544"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:38:01.790Z"
  - id: "INS-006"
    kind: "insight"
    description: "The corrected independent designated comparison also required more than 30 seconds to complete."
    fp: "c5a74d9a5c67"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:40:03.614Z"
  - id: "DL-062"
    kind: "difficulty"
    description: "A documentation update command was rejected because existing Markdown code spans looked like shell expansion inside the wrapper."
    fp: "61954a7db262"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:42:40.744Z"
  - id: "DL-063"
    kind: "difficulty"
    description: "Full validation failed at the canonical formatting gate and required deterministic source formatting."
    fp: "9cc0f116f22a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:43:56.576Z"
  - id: "INS-007"
    kind: "insight"
    description: "The canonical full validation suite required more than 30 seconds because it includes real Chromium workbench cleanup and parity scenarios."
    fp: "eab8431c0969"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:45:18.353Z"
  - id: "CONF-019"
    kind: "confusion"
    description: "The appended documentation rendered escaped newline text instead of Markdown paragraphs, requiring a scoped newline conversion."
    fp: "3f4926417c58"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:45:56.365Z"
  - id: "INS-008"
    kind: "insight"
    description: "The final canonical validation run required more than 30 seconds because of the real Chromium workbench scenarios."
    fp: "81bd352b383e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:48:00.067Z"
  - id: "INS-009"
    kind: "insight"
    description: "The token-safe final canonical validation run required more than 30 seconds because of real Chromium workbench scenarios."
    fp: "4963cd3c21e4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T01:50:12.745Z"
  - id: "DL-064"
    kind: "difficulty"
    description: "Repository search had to be retried because rg was unavailable in the environment."
    fp: "c114a7185a5f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:00:01.410Z"
  - id: "DL-065"
    kind: "difficulty"
    description: "Artifact inspection had to be retried because the python command was unavailable; python3 is required."
    fp: "00cf5f5e3603"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:00:22.507Z"
  - id: "DL-066"
    kind: "difficulty"
    description: "Focused BL-003 validation failed because retained attempt records referenced absent raw terminal artifacts, confirming the verifier defect before regeneration."
    fp: "ace5f3f91894"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:03:10.778Z"
  - id: "COORD-004"
    kind: "coordination"
    description: "The designated six-attempt browser comparison required more than 30 seconds to complete."
    fp: "1a68d47d594b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:04:44.310Z"
  - id: "DL-067"
    kind: "difficulty"
    description: "Designated comparison attempts passed, but conditional ADR materialization failed because the regenerated selection conflicted with the existing ADR."
    fp: "78676b9a006b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:04:44.550Z"
  - id: "DL-068"
    kind: "difficulty"
    description: "The first surgical ADR materializer edit did not match the source block and had to be retried."
    fp: "076a737d9502"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:06:20.185Z"
  - id: "WIN-004"
    kind: "win"
    description: "The designated comparison was rerun after correcting evidence-driven ADR regeneration, and the paved command then passed."
    fp: "05980f6da888"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:08:44.684Z"
  - id: "COORD-005"
    kind: "coordination"
    description: "The corrected designated six-attempt comparison required more than 30 seconds to complete."
    fp: "0f7437aa922e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:08:44.765Z"
  - id: "DL-069"
    kind: "difficulty"
    description: "A documentation edit command was blocked because Markdown backticks in a shell string were interpreted as unsafe command substitution, requiring a safer retry."
    fp: "c6782d335752"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:09:48.769Z"
  - id: "DL-070"
    kind: "difficulty"
    description: "Full validation failed its formatting check for the regenerated ADR source and comparison JSON, requiring deterministic formatting corrections."
    fp: "9b083a370a4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:10:39.611Z"
  - id: "DL-071"
    kind: "difficulty"
    description: "Full validation reached type checking and failed on an unused ADR evidence variable introduced by generalized selection materialization."
    fp: "140072095eea"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:11:30.822Z"
  - id: "COORD-006"
    kind: "coordination"
    description: "The successful full verification gate required more than 30 seconds because it included real code-server Chromium cleanup and parity scenarios."
    fp: "a17cb01460e3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:13:02.014Z"
  - id: "COORD-007"
    kind: "coordination"
    description: "The final successful full verification after evidence-note updates required more than 30 seconds for its real browser scenarios."
    fp: "839887151458"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:14:46.407Z"
  - id: "DL-072"
    kind: "difficulty"
    description: "Repository search expected ripgrep, but the tool was unavailable and required a grep fallback."
    fp: "f9a6300c7c42"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:21:48.275Z"
  - id: "CONF-020"
    kind: "confusion"
    description: "A source-file range was estimated past the file end and required a corrected read strategy."
    fp: "954e500de0bf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:22:14.118Z"
  - id: "DL-073"
    kind: "difficulty"
    description: "The repository environment lacked the expected python alias, so file editing had to backtrack to Node.js."
    fp: "4fa30f3552eb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:23:06.797Z"
  - id: "COORD-008"
    kind: "coordination"
    description: "The designated six-attempt browser comparison required more than 30 seconds to complete."
    fp: "1a68d47d594b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:25:26.493Z"
  - id: "DL-074"
    kind: "difficulty"
    description: "Full validation found formatting drift in the new regression test and regenerated comparison evidence."
    fp: "096f4f672870"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:26:32.092Z"
  - id: "CONF-021"
    kind: "confusion"
    description: "Full validation still reported formatting drift because the first formatter edit did not load repository configuration."
    fp: "92913802e7d6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:27:14.647Z"
  - id: "COORD-009"
    kind: "coordination"
    description: "The complete repository validation suite required more than 30 seconds to finish."
    fp: "295b8901b53a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T02:28:28.779Z"
  - id: "DL-075"
    kind: "difficulty"
    description: "Focused validation failed because the designated prerequisite check stopped before later records; diagnosis was required."
    fp: "d19328a86ae6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:08:05.938Z"
  - id: "DL-076"
    kind: "difficulty"
    description: "Focused validation still failed after a partial prerequisite parser fix, requiring a second diagnostic pass."
    fp: "3af88a35d462"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:08:28.684Z"
  - id: "INS-010"
    kind: "insight"
    description: "Focused validation exposed an argument-shape bug in the /proc prerequisite read after repeated diagnosis."
    fp: "e32cce9b2963"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:08:54.896Z"
  - id: "DL-077"
    kind: "difficulty"
    description: "Focused evidence validation failed and required correcting the retention directory setup."
    fp: "c15b8c12a78c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:14:40.149Z"
  - id: "CONF-022"
    kind: "confusion"
    description: "Atomic evidence writing assumed an uncreated implementation/evidence parent directory."
    fp: "30a25b1c0088"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:14:40.171Z"
  - id: "WIN-005"
    kind: "win"
    description: "The real designated-host 1/3/5/10 baseline required a tool wait longer than 30 seconds."
    fp: "138f77fa45de"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:17:15.806Z"
  - id: "INS-011"
    kind: "insight"
    description: "The retained first-position CPU summary exposed that auxiliary process baselines were anchored in the wrong order."
    fp: "6178a901e729"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:18:05.849Z"
  - id: "DL-078"
    kind: "difficulty"
    description: "The designated episode required backtracking before retention so sampling anchor order could match the Plan."
    fp: "c9ab592b43b6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:18:07.666Z"
  - id: "WIN-006"
    kind: "win"
    description: "The corrected designated-host baseline completed after another bounded wait longer than 30 seconds."
    fp: "ce6d6306cf5e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:19:56.191Z"
  - id: "DL-079"
    kind: "difficulty"
    description: "Focused documentation validation failed and required correction."
    fp: "9b16fcd3f144"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:21:41.922Z"
  - id: "CONF-023"
    kind: "confusion"
    description: "The focused failure output was truncated before the missing documentation token was visible."
    fp: "ed6935a955e4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:21:42.352Z"
  - id: "DL-080"
    kind: "difficulty"
    description: "Focused documentation validation failed again after numeric-format correction."
    fp: "b0e1c51aea72"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:22:15.319Z"
  - id: "CONF-024"
    kind: "confusion"
    description: "The repeated focused failure was again truncated before its missing token, requiring output-file inspection."
    fp: "cf354272b5c1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:22:15.701Z"
  - id: "CONF-025"
    kind: "confusion"
    description: "A third truncated assertion required another bounded output-file inspection."
    fp: "7b7ef4f8c3d1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:22:40.792Z"
  - id: "DL-081"
    kind: "difficulty"
    description: "Focused documentation validation still failed while tightening source-to-runbook consistency."
    fp: "df0393ddb6db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:22:40.930Z"
  - id: "DL-082"
    kind: "difficulty"
    description: "Full validation failed at the configured formatting gate and required correction before handoff."
    fp: "65d69d7046ee"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:23:25.458Z"
  - id: "DL-083"
    kind: "difficulty"
    description: "Full validation reached type checking and exposed two strict TypeScript defects requiring correction."
    fp: "93028f95ff04"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:24:00.266Z"
  - id: "DL-084"
    kind: "difficulty"
    description: "Full validation failed the configured global branch coverage threshold after all behavioral tests passed."
    fp: "15f7e5828260"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:24:35.218Z"
  - id: "INS-012"
    kind: "insight"
    description: "Full validation exposed concurrent test evidence directories racing with the designated-run inventory assertion."
    fp: "4ab44326f01a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:25:39.708Z"
  - id: "DL-085"
    kind: "difficulty"
    description: "Full validation branch coverage improved but remained 0.28 percentage points below the configured threshold."
    fp: "e366f0009a05"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:26:31.680Z"
  - id: "WIN-007"
    kind: "win"
    description: "The canonical full gate completed after a tool wait longer than 30 seconds and ended with a clean BL-004 audit."
    fp: "6fc1f19844db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:28:30.045Z"
  - id: "SUGG-005"
    kind: "improvement-suggestion"
    description: "Staged integrity checking required backtracking to remove renderer-produced Markdown trailing whitespace."
    fp: "fc8ebb1ecfab"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:29:42.238Z"
  - id: "WIN-008"
    kind: "win"
    description: "The final canonical full gate rerun completed after a wait longer than 30 seconds and retained a clean capacity audit."
    fp: "37b6175f0c0a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:31:08.515Z"
  - id: "CONF-026"
    kind: "confusion"
    description: "Verifier feedback was supplied in the request but no retained verification artifact was found in the work-item tree."
    fp: "4d524344d380"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:39:51.565Z"
  - id: "DL-086"
    kind: "difficulty"
    description: "The documented python command was unavailable, requiring a retry with python3 for repository edits."
    fp: "faf8abe9e2bf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:41:35.653Z"
  - id: "DL-087"
    kind: "difficulty"
    description: "Shell quoting interrupted the first contract edit, so the edit was retried with a safe quoting strategy."
    fp: "673b36ce12cf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:42:15.750Z"
  - id: "DL-088"
    kind: "difficulty"
    description: "A second multiline edit had to be retried after an import-string quoting error."
    fp: "9f2d74e5b1ff"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:43:36.640Z"
  - id: "DL-089"
    kind: "difficulty"
    description: "A small contract edit required a quoting retry before it could be applied safely."
    fp: "0826c477008a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:44:45.399Z"
  - id: "DL-090"
    kind: "difficulty"
    description: "Focused validation failed after the sensor-contract edits because fixtures lacked the new readiness attribution fields."
    fp: "f7b440a69974"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:47:10.871Z"
  - id: "DL-091"
    kind: "difficulty"
    description: "Updating multiple TypeScript fixtures required a retry after unsafe nested quoting split the edit command."
    fp: "b3e5fda4009e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:47:42.728Z"
  - id: "INS-013"
    kind: "insight"
    description: "Focused validation exposed that the missing-workload control now failed earlier at the stricter per-tree completeness boundary."
    fp: "f36312c7f228"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:47:58.042Z"
  - id: "DL-092"
    kind: "difficulty"
    description: "The sampling-test import replacement required another retry after a malformed string literal."
    fp: "42baba60e4fc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:49:21.071Z"
  - id: "DL-093"
    kind: "difficulty"
    description: "The sampling-test edit was retried after the initial Python string prefix was parsed as code."
    fp: "32259a4f5bd9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:49:21.076Z"
  - id: "DL-094"
    kind: "difficulty"
    description: "The coordinator-test update was retried after a nested quoted expression broke the edit command."
    fp: "7975e011a222"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:50:31.182Z"
  - id: "DL-095"
    kind: "difficulty"
    description: "Focused validation found generated test source contained literal newlines inside join delimiters."
    fp: "80705010a888"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:50:46.731Z"
  - id: "DL-096"
    kind: "difficulty"
    description: "Focused validation caught another generated newline delimiter in the newly added fixture-preflight control."
    fp: "274a3d005453"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:52:12.327Z"
  - id: "DL-097"
    kind: "difficulty"
    description: "The designated baseline command remained alive for more than 30 seconds after emitting completion because a deadline timer was not cleared."
    fp: "48a12f018ac3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:56:38.021Z"
  - id: "DL-098"
    kind: "difficulty"
    description: "The first corrected designated rerun had to be stopped and discarded after the uncleared timer prevented bounded command completion."
    fp: "dd3f44e76765"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:56:38.088Z"
  - id: "COORD-010"
    kind: "coordination"
    description: "The final designated 1/3/5/10 baseline required more than 30 seconds to complete its documented sampling windows."
    fp: "395ce7e0fa11"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:58:31.565Z"
  - id: "INS-014"
    kind: "insight"
    description: "The regenerated baseline exposed sub-millisecond early timer wakeups, so its passing disposition was discarded and exact boundaries were corrected."
    fp: "15ed303ad87d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:59:08.555Z"
  - id: "INS-015"
    kind: "insight"
    description: "Focused scheduler validation showed the old missed-position fixture relied on an artificial zero-duration sleep that the exact scheduler correctly removed."
    fp: "ffb0975e40b4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T04:59:30.256Z"
  - id: "COORD-011"
    kind: "coordination"
    description: "The exact-boundary designated baseline required more than 30 seconds for its four controlled cohorts."
    fp: "2142fd19f191"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:01:17.002Z"
  - id: "DL-099"
    kind: "difficulty"
    description: "A documentation edit containing Markdown backticks was blocked as unsafe shell substitution and had to be reformulated."
    fp: "4ffd1c17cb6a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:02:06.169Z"
  - id: "DL-100"
    kind: "difficulty"
    description: "Full validation failed at the canonical format check after the multiline sensor-contract edits."
    fp: "6c7c386fd0d2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:03:16.582Z"
  - id: "DL-101"
    kind: "difficulty"
    description: "Full validation advanced to type checking and found one stale workload-command import."
    fp: "f4a24d294ac1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:03:49.907Z"
  - id: "DL-102"
    kind: "difficulty"
    description: "Full validation reached coverage and failed because new deadline and setup-classification branches reduced API branch coverage below 80 percent."
    fp: "5b525e803666"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:04:41.535Z"
  - id: "DL-103"
    kind: "difficulty"
    description: "Full validation remained just below the branch threshold after the first CLI control expansion, requiring fixture-mutation and release-failure controls."
    fp: "f255129c0e26"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:05:44.567Z"
  - id: "CONF-027"
    kind: "confusion"
    description: "Full validation branch coverage did not improve because the added mutation/release assertions exercised already-counted condition branches."
    fp: "fe9ce798afd5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:06:53.053Z"
  - id: "COORD-012"
    kind: "coordination"
    description: "The passing canonical full validation required more than 30 seconds because it includes bounded Playwright lifecycle episodes."
    fp: "95196c7c8953"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:09:11.618Z"
  - id: "COORD-013"
    kind: "coordination"
    description: "The final post-notes canonical validation required more than 30 seconds and completed with the bounded cleanup audit passing."
    fp: "d430ecf58c78"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:11:34.187Z"
  - id: "CONF-028"
    kind: "confusion"
    description: "Definitive full validation hit an unrelated ambiguous Playwright terminal-readiness failure before the expected timeout assertion, requiring a canonical rerun."
    fp: "f3c3ac1b4d11"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:13:40.505Z"
  - id: "DL-104"
    kind: "difficulty"
    description: "The same Playwright terminal-readiness failure repeated on the canonical rerun, so it required diagnosis rather than another blind retry."
    fp: "7c96c6220135"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:14:40.466Z"
  - id: "INS-016"
    kind: "insight"
    description: "Canonical coverage fluctuated below threshold by one branch, showing the correction needed deterministic margin rather than exact-threshold coverage."
    fp: "25281a02545c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:15:34.432Z"
  - id: "INS-017"
    kind: "insight"
    description: "The e2e correction opened the terminal reliably, but the parity command raced terminal focus/shell readiness and produced no raw artifact."
    fp: "9db7ed65c92a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:20:10.611Z"
  - id: "COORD-014"
    kind: "coordination"
    description: "The failed e2e validation took more than 30 seconds because the parity artifact poll exhausted its 45-second bound."
    fp: "05bf4f57940a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:20:23.691Z"
  - id: "COORD-015"
    kind: "coordination"
    description: "The passing e2e lifecycle validation required more than 30 seconds and ended with the capacity cleanup audit passing."
    fp: "89ef105c63bc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:21:51.701Z"
  - id: "COORD-016"
    kind: "coordination"
    description: "The final canonical handoff validation required more than 30 seconds and completed with all stages and cleanup audit passing."
    fp: "b24557cfbfba"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:23:39.027Z"
  - id: "DL-105"
    kind: "difficulty"
    description: "The expected patch helper was unavailable, requiring a different repository edit method."
    fp: "431a91499b35"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:57:01.880Z"
  - id: "COORD-017"
    kind: "coordination"
    description: "Editing backtracked after the patch command was not installed in the environment."
    fp: "25deff0c1869"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:57:02.060Z"
  - id: "CONF-029"
    kind: "confusion"
    description: "The documented Python command alias was absent; repository edits must use python3 instead."
    fp: "f8c0986a3fc9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T05:58:03.925Z"
  - id: "DL-106"
    kind: "difficulty"
    description: "Focused validation failed on a sampling parse error and required diagnosis."
    fp: "475445121e5e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:01:36.291Z"
  - id: "INS-018"
    kind: "insight"
    description: "Focused validation exposed that post-start inspection was overwriting the original attributable failure reason."
    fp: "8c3d18204e2f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:02:08.689Z"
  - id: "DL-107"
    kind: "difficulty"
    description: "Focused validation failed after the cancellation refactor, exposing one over-broad replacement and stale controlled fixtures."
    fp: "cd611a8aeea7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:04:48.533Z"
  - id: "SUGG-006"
    kind: "improvement-suggestion"
    description: "Focused validation found deadline and fixture-specific diagnostics were lost on successful partial finalization."
    fp: "3d549ddc9d34"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:05:36.999Z"
  - id: "CONF-030"
    kind: "confusion"
    description: "Focused evidence validation failed because the comparison-column assertion still described the superseded combined count."
    fp: "065a3462ae55"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:07:57.756Z"
  - id: "DL-108"
    kind: "difficulty"
    description: "Focused validation caught newline escaping errors in newly added controlled assertions."
    fp: "60b21cd96577"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:10:42.409Z"
  - id: "WIN-009"
    kind: "win"
    description: "The complete focused suite correctly rejected the stale designated evidence before regeneration."
    fp: "e6c05d04cb4f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:11:20.824Z"
  - id: "INS-019"
    kind: "insight"
    description: "The pre-run audit detected expected comparison drift after splitting host and process-tree completeness columns."
    fp: "d481e99b71de"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:11:41.337Z"
  - id: "COORD-018"
    kind: "coordination"
    description: "The fresh designated 1/3/5/10 baseline required more than 30 seconds to complete."
    fp: "1ef43fbaff1e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:13:47.791Z"
  - id: "DL-109"
    kind: "difficulty"
    description: "A documentation edit was blocked because Markdown backticks were interpreted as shell command substitution, requiring safer encoding."
    fp: "d85bb41b5d08"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:14:38.796Z"
  - id: "DL-110"
    kind: "difficulty"
    description: "Full validation failed at the formatting gate after the implementation edits."
    fp: "cf9edd6f4dd2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:16:37.245Z"
  - id: "DL-111"
    kind: "difficulty"
    description: "Full validation failed because new cooperative failure branches lowered API branch coverage below 80 percent."
    fp: "18696b8399f4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:17:25.268Z"
  - id: "DL-112"
    kind: "difficulty"
    description: "Focused validation caught another newline escaping error in the new nonzero-workload assertion."
    fp: "257d2065197b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:18:43.843Z"
  - id: "DL-113"
    kind: "difficulty"
    description: "Full validation improved branch coverage to 79.32 percent but still failed the 80 percent threshold."
    fp: "befee04150ec"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:19:44.158Z"
  - id: "DL-114"
    kind: "difficulty"
    description: "Full validation reached 79.93 percent branch coverage, leaving one additional controlled branch needed."
    fp: "54f7b6e24395"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:21:02.805Z"
  - id: "COORD-019"
    kind: "coordination"
    description: "The passing canonical full validation required more than 30 seconds because it included bounded real browser lifecycle scenarios."
    fp: "95196c7c8953"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:22:56.885Z"
  - id: "DL-115"
    kind: "difficulty"
    description: "Final validation exposed that strict audit error classification added uncovered branches and reduced aggregate coverage to 79.53 percent."
    fp: "63f7432a7a6f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:25:37.756Z"
  - id: "COORD-020"
    kind: "coordination"
    description: "The final passing full gate again required more than 30 seconds for real browser lifecycle coverage."
    fp: "0abc3a6784f6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:28:04.332Z"
  - id: "COORD-021"
    kind: "coordination"
    description: "The handoff full gate took more than 30 seconds and completed with the final clean BL-004 audit."
    fp: "ae5bbab66690"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T06:29:46.789Z"
  - id: "DL-116"
    kind: "difficulty"
    description: "The initial work-item lookup assumed a python executable, but only python3 is available; retrying with the available runtime."
    fp: "1d3bf9c37328"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:42:39.282Z"
  - id: "DL-117"
    kind: "difficulty"
    description: "The repository image lacks ripgrep, so the planned test search had to be retried with grep."
    fp: "2c3319346aeb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:43:54.129Z"
  - id: "DL-118"
    kind: "difficulty"
    description: "The broad source and test searches exceeded readable tool output, requiring narrower file ranges."
    fp: "31627ea989a5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:44:08.387Z"
  - id: "CONF-031"
    kind: "confusion"
    description: "The expected package-local Vitest config path was absent, requiring inspection of the package directory for the actual config."
    fp: "243cf67dd56a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:44:49.769Z"
  - id: "DL-119"
    kind: "difficulty"
    description: "The first scripted test edit used incompatible shell quoting and had to be retried without changing files."
    fp: "8183a081cb47"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:45:40.538Z"
  - id: "DL-120"
    kind: "difficulty"
    description: "Full validation failed because the new evidence test did not match repository formatting."
    fp: "59343ac893d9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:46:40.206Z"
  - id: "DL-121"
    kind: "difficulty"
    description: "The manual formatting correction was incomplete; the root format recipe still rejected the evidence test and required formatter-aligned editing."
    fp: "423f569f29f4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:47:30.359Z"
  - id: "DL-122"
    kind: "difficulty"
    description: "The implementation-note edit contained Markdown backticks that the shell correctly treated as unsafe command substitution, so the edit was retried with shell-safe text."
    fp: "0898ee933a22"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:49:56.750Z"
  - id: "COORD-022"
    kind: "coordination"
    description: "The first successful full verification waited over 30 seconds while bounded Playwright cancellation and parity scenarios completed."
    fp: "f221c0fe7a12"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:52:19.291Z"
  - id: "COORD-023"
    kind: "coordination"
    description: "The repeated full verification also waited over 30 seconds for the same bounded Playwright scenarios, confirming stable coverage and cleanup results."
    fp: "74b48530a12c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T08:52:29.169Z"
  - id: "CONF-032"
    kind: "confusion"
    description: "Implementation request referenced Plan artifacts without embedding the canonical plan handoff, so artifact matching required direct review."
    fp: "b4dbb89df345"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T23:53:57.066Z"
  - id: "DL-123"
    kind: "difficulty"
    description: "The repository shell did not provide the expected python command, requiring a retry with the available python3 executable."
    fp: "cd55ec767aae"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T23:55:50.660Z"
  - id: "DL-124"
    kind: "difficulty"
    description: "Focused migration validation failed because relative file URL semantics and Vitest table argument spreading were initially incorrect."
    fp: "696d38719226"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T23:57:41.657Z"
  - id: "DL-125"
    kind: "difficulty"
    description: "The first python3 edit retry exposed shell quoting loss, requiring a second backtrack to double-quoted source content."
    fp: "3b37bfd9b0f5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T23:57:55.214Z"
  - id: "DL-126"
    kind: "difficulty"
    description: "Fixture generation initially resolved repository-relative paths from the package working directory and required a path-resolution retry."
    fp: "89de6661bfc7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-10T23:59:49.973Z"
  - id: "DL-127"
    kind: "difficulty"
    description: "Full validation stopped at the repository formatting gate because newly added TypeScript files required Prettier normalization."
    fp: "bc54fb8d07b1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T00:08:00.419Z"
  - id: "DL-128"
    kind: "difficulty"
    description: "Full validation revealed root-focused tests had inferred the process working directory; recursive package tests use apps/api, so repository paths required an explicit import-relative root."
    fp: "5a86dca5cd6d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T00:08:59.839Z"
  - id: "DL-129"
    kind: "difficulty"
    description: "A bulk path-correction edit hit shell quoting and was split into smaller explicit edits."
    fp: "6dcc20df47df"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T00:10:28.382Z"
  - id: "DL-130"
    kind: "difficulty"
    description: "The first smaller architecture-path edit still had dynamic quote construction and required a direct file rewrite."
    fp: "4d292722d53c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T00:10:56.506Z"
  - id: "DL-131"
    kind: "difficulty"
    description: "Focused documentation validation failed because the source-contract assertion coupled column names to double-quote formatting rather than semantic literals."
    fp: "8d1536a4473e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T00:11:29.857Z"
  - id: "DL-132"
    kind: "difficulty"
    description: "The coupled persistence claim search required a retry with repository-available tools."
    fp: "c7fc0440367e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:19:43.475Z"
  - id: "CONF-033"
    kind: "confusion"
    description: "The repository environment did not provide rg for the planned persistence documentation search."
    fp: "4f87acd68700"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:19:43.574Z"
  - id: "CONF-034"
    kind: "confusion"
    description: "Initial persistence source path assumptions were wrong, so source entrypoints had to be listed and reread."
    fp: "7cb043d3d82d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:20:29.881Z"
  - id: "CONF-035"
    kind: "confusion"
    description: "The documented python command was unavailable for applying documentation edits."
    fp: "b5edb336c9b9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:21:34.583Z"
  - id: "DL-133"
    kind: "difficulty"
    description: "Documentation editing required a retry with the repository Node.js runtime."
    fp: "b723dabe0454"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:21:34.596Z"
  - id: "DL-134"
    kind: "difficulty"
    description: "The first documentation-test edit used the wrong quote style and required a targeted retry."
    fp: "5e1c6f2b8fe6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:22:50.108Z"
  - id: "DL-135"
    kind: "difficulty"
    description: "The root formatting gate rejected quote and line-wrap style in the new persistence contract assertions."
    fp: "ba46c8a39f5e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:23:44.495Z"
  - id: "DL-136"
    kind: "difficulty"
    description: "The manual first formatting correction was incomplete and required another formatting inspection."
    fp: "bdb1e234506b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:24:18.701Z"
  - id: "CONF-036"
    kind: "confusion"
    description: "The unrelated process-absence assertion gave no clear persistence-documentation cause, making the full-gate failure ambiguous."
    fp: "f5484c1a755e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:25:42.688Z"
  - id: "DL-137"
    kind: "difficulty"
    description: "Full validation failed in the unrelated workbench readiness-timeout cleanup test and required diagnosis."
    fp: "395b706a093a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:25:42.794Z"
  - id: "DL-138"
    kind: "difficulty"
    description: "The unrelated full-gate failure required a focused retry before rerunning the complete gate."
    fp: "28b91b043caf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T03:25:55.776Z"
  - id: "DL-139"
    kind: "difficulty"
    description: "A safe source-file write was blocked because TypeScript template literals resembled shell expansion, requiring a different edit method."
    fp: "45f3c6b93939"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:17:03.764Z"
  - id: "CONF-037"
    kind: "confusion"
    description: "The documented Python tool alias was unavailable, so file editing had to switch to the installed python3 runtime."
    fp: "75abe531cb3b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:17:47.513Z"
  - id: "DL-140"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis: a leakage assertion matched the public outside_opening_policy category itself."
    fp: "a9771305da59"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:19:46.121Z"
  - id: "DL-141"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis: locale sorting placed the fixture root marker after whitespace-prefixed entries."
    fp: "91ae002e2770"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:22:22.913Z"
  - id: "DL-142"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis: two fresh test services reused an injected candidate ID, causing an unrelated primary-key conflict."
    fp: "c8398c639e87"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:23:52.769Z"
  - id: "DL-143"
    kind: "difficulty"
    description: "A typed template-literal field edit was blocked as shell expansion, so the implementation retained a safe runtime field constructor without weakening output validation."
    fp: "8fb474a0c795"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:25:30.222Z"
  - id: "DL-144"
    kind: "difficulty"
    description: "The application documentation edit was blocked because Markdown code ticks were interpreted as shell syntax, requiring a quoting-safe retry."
    fp: "de13360cd963"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:26:28.930Z"
  - id: "DL-145"
    kind: "difficulty"
    description: "The API documentation edit was blocked because Markdown code ticks were interpreted as shell syntax, requiring a quoting-safe retry."
    fp: "28c1ad320187"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:26:32.586Z"
  - id: "DL-146"
    kind: "difficulty"
    description: "The justfile edit was blocked because embedded command text resembled unsafe shell construction, requiring a quoting-safe retry."
    fp: "6bf2de2bd26b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:26:33.093Z"
  - id: "DL-147"
    kind: "difficulty"
    description: "Full validation failed at the configured formatting gate and required corrective formatting of the new registration files."
    fp: "65d69d7046ee"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:28:54.665Z"
  - id: "DL-148"
    kind: "difficulty"
    description: "Full validation failed and required diagnosis: package-scoped execution exposed a repository-root path bug in BL-006 fixture evidence."
    fp: "ca809effbafa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:29:54.535Z"
  - id: "INS-020"
    kind: "insight"
    description: "The recursive package test changes process cwd, a hidden setup detail that made path.resolve target apps/api instead of the repository root."
    fp: "cfc0be789410"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:29:55.071Z"
  - id: "COORD-024"
    kind: "coordination"
    description: "The complete validation command waited over 30 seconds while the bounded Playwright workbench scenarios completed."
    fp: "9779ce83f383"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:32:08.721Z"
  - id: "DL-149"
    kind: "difficulty"
    description: "A narrow field-type replacement missed Prettier's single-line layout and required an exact-context retry."
    fp: "5f0b83feec50"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:34:04.009Z"
  - id: "COORD-025"
    kind: "coordination"
    description: "The final complete validation command waited over 30 seconds for the bounded Playwright workbench scenarios."
    fp: "0affcac3d930"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:36:39.829Z"
  - id: "DL-150"
    kind: "difficulty"
    description: "BL-007 pre-flight hit a transient cancelled-process startTimeTicks assertion after the process exited"
    fp: "e478f24f4633"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T05:57:57.393Z"
  - id: "COORD-026"
    kind: "coordination"
    description: "Issue 17 Plan artifacts were present only as untracked files at implementation start, so implementation must preserve and commit the coordinator-provided Plan content."
    fp: "8c131a27c153"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:28:00.250Z"
  - id: "DL-151"
    kind: "difficulty"
    description: "The repository environment did not provide ripgrep for source discovery, requiring a fallback to bounded grep and find commands."
    fp: "fb4727c267e8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:29:03.752Z"
  - id: "SUGG-007"
    kind: "improvement-suggestion"
    description: "A broad harness guidance search exceeded the tool output bound despite a line cap, requiring narrower file-scoped searches."
    fp: "9e117c7a5dba"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:30:04.361Z"
  - id: "DL-152"
    kind: "difficulty"
    description: "The engineering-harness flow skill exceeded the whole-file view limit, requiring a ranged read before invoking the pre-coding seam."
    fp: "1fb7c6ff8336"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:30:25.115Z"
  - id: "CONF-038"
    kind: "confusion"
    description: "The tool contract advertised Python execution, but the repository shell had no python command; the first edit batch made no changes and had to be retried with Node."
    fp: "321f9322d5e1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:32:45.966Z"
  - id: "DL-153"
    kind: "difficulty"
    description: "Focused T-1 validation showed Fastify plugin encapsulation hid the initialized projectLibrary from the controller-level lifecycle proof."
    fp: "be8437abe839"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:34:04.377Z"
  - id: "DL-154"
    kind: "difficulty"
    description: "Focused T-3 validation exposed missing Testing Library cleanup between component tests, causing prior mounted request harnesses to contaminate later role queries."
    fp: "f12873c5a4c6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:37:50.309Z"
  - id: "CONF-039"
    kind: "confusion"
    description: "The repository had no keyboard-user Testing Library helper despite the Plan's component-interaction wording, so component proof must use native semantic focus/click assertions while Playwright supplies real Tab/Enter evidence."
    fp: "757bf1de1e69"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:39:08.073Z"
  - id: "INS-021"
    kind: "insight"
    description: "Focused T-4 validation showed Testing Library's title query normalizes whitespace, making it unsuitable for proving byte-exact leading and trailing canonical path text."
    fp: "07de14449be7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:40:16.384Z"
  - id: "INS-022"
    kind: "insight"
    description: "The revised T-4 path-safety assertion incorrectly treated an unchanged metacharacter-bearing title attribute as executable markup; DOM node inspection is the correct interpretation proof."
    fp: "82a60cabeb6e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:40:58.012Z"
  - id: "SUGG-008"
    kind: "improvement-suggestion"
    description: "The root browser validation took over 30 seconds while running the full repository Playwright suite because no focused browser recipe exists."
    fp: "bb0021ae826d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:45:32.282Z"
  - id: "CONF-040"
    kind: "confusion"
    description: "A documentation edit command was blocked by shell-security pattern detection even though it only passed static Markdown, requiring the edit to be split and rewritten."
    fp: "b37a9ef6259d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:47:41.129Z"
  - id: "CONF-041"
    kind: "confusion"
    description: "A second static documentation-test edit was blocked because the shell scanner treated escaped Markdown backticks as dangerous, requiring a backtick-free replacement command."
    fp: "e2f870b8ebd4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:50:17.804Z"
  - id: "DL-155"
    kind: "difficulty"
    description: "The shell scanner blocked the rewritten documentation test again solely because its static expected string contained Markdown backtick characters."
    fp: "d2459b26d87b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:50:50.914Z"
  - id: "DL-156"
    kind: "difficulty"
    description: "Focused T-6 documentation validation failed with diagnostics beyond the tool output limit, requiring inspection of the saved bounded output before correction."
    fp: "e52db6f50356"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:51:35.480Z"
  - id: "DL-157"
    kind: "difficulty"
    description: "Full validation failed at the root format-check stage because nine newly edited TypeScript files did not yet match repository Prettier output."
    fp: "096d7d008520"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:53:10.096Z"
  - id: "DL-158"
    kind: "difficulty"
    description: "Full validation then reached TypeScript and found a React 19 useRef initializer requirement plus a zero-argument mock signature that hid the owned AbortSignal in the unmount proof."
    fp: "af918b78d75e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:54:03.374Z"
  - id: "DL-159"
    kind: "difficulty"
    description: "Full validation reached coverage and reported API branch coverage at 79.64%, exposing uncovered lifecycle-default and malformed-list branches without weakening the 80% threshold."
    fp: "80d14cd34c4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:55:32.184Z"
  - id: "WIN-010"
    kind: "win"
    description: "The successful full repository gate took over 30 seconds because it includes package coverage, build, the complete Playwright suite, and retained capacity audit."
    fp: "a0466fe6fd37"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:57:55.831Z"
  - id: "DL-160"
    kind: "difficulty"
    description: "The saved full-validation output had fewer lines than the estimated tail range, requiring a corrected bounded read."
    fp: "c26f5ed2480e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T06:58:13.125Z"
  - id: "INS-023"
    kind: "insight"
    description: "The final successful full gate again took over 30 seconds and surfaced a non-failing lint warning that the new startup outcome helper import was not actually exercised."
    fp: "1540dcbb67d1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:01:35.761Z"
  - id: "WIN-011"
    kind: "win"
    description: "The definitive full repository gate took over 30 seconds and completed without lint warnings or failures after the startup outcome proof was exercised."
    fp: "e3fa8995830b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:03:44.944Z"
  - id: "WIN-012"
    kind: "win"
    description: "The complete-tree full gate, including implementation evidence, took over 30 seconds and exited zero with browser and residual-resource cleanup passing."
    fp: "27bbe6ed24da"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:06:36.401Z"
  - id: "COORD-027"
    kind: "coordination"
    description: "Repository search required a grep fallback because the expected ripgrep executable was unavailable."
    fp: "e2232e10ae67"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:18:51.381Z"
  - id: "DL-161"
    kind: "difficulty"
    description: "A planned file-edit script required backtracking because the expected Python executable was unavailable."
    fp: "987b19688169"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:22:25.889Z"
  - id: "DL-162"
    kind: "difficulty"
    description: "Focused process-group validation failed and required diagnosis of cleanup test timeouts."
    fp: "d559a1fdc85d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:25:11.770Z"
  - id: "INS-024"
    kind: "insight"
    description: "Repeated focused validation exposed nondeterministic early-exit detail capture after the category race was fixed."
    fp: "a8d8ae60ed52"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:28:16.484Z"
  - id: "COORD-028"
    kind: "coordination"
    description: "The owned Chromium proof required more than 30 seconds to complete before returning passing cleanup evidence."
    fp: "de6b14296e58"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:31:12.640Z"
  - id: "COORD-029"
    kind: "coordination"
    description: "A bulk documentation edit was blocked by shell safety heuristics and required splitting into simpler edits."
    fp: "85141b03b569"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:32:09.257Z"
  - id: "DL-163"
    kind: "difficulty"
    description: "Full validation failed on repository formatting for four changed TypeScript files and required correction."
    fp: "15c47c64f2ef"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:35:18.807Z"
  - id: "SUGG-009"
    kind: "improvement-suggestion"
    description: "Full validation then exposed an obsolete processExists helper after the exit-detection refactor."
    fp: "5d8fbee356a0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:36:11.390Z"
  - id: "DL-164"
    kind: "difficulty"
    description: "Full validation exposed a bounded migration integration timeout under concurrent package load and required diagnosis before rerun."
    fp: "0115ff7d158f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:37:23.329Z"
  - id: "DL-165"
    kind: "difficulty"
    description: "Focused validation caught readiness-source escaping lost while consolidating process-group tests."
    fp: "4575f6aa88d1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:39:05.147Z"
  - id: "COORD-030"
    kind: "coordination"
    description: "The complete repository validation required more than 30 seconds and returned a passing result."
    fp: "13aa55dc1a66"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:41:15.828Z"
  - id: "DL-166"
    kind: "difficulty"
    description: "Final full validation exposed both the existing migration timeout under load and a nondeterministic survivor fixture signal race."
    fp: "28566a03a936"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:44:08.002Z"
  - id: "COORD-031"
    kind: "coordination"
    description: "The final corrected full validation required more than 30 seconds and completed successfully."
    fp: "7541ce57edad"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:49:02.784Z"
  - id: "COORD-032"
    kind: "coordination"
    description: "Validation of the exact final tree required more than 30 seconds and completed successfully."
    fp: "86f7f51c8c57"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T07:51:37.678Z"
  - id: "DL-167"
    kind: "difficulty"
    description: "The task breakdown exceeded the file-view limit and required bounded range reads."
    fp: "bcb7bc41574c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:02:30.367Z"
  - id: "CONF-042"
    kind: "confusion"
    description: "The documented Python tool name was unavailable; the repository environment exposes python3 instead."
    fp: "caf3cf05d1d0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:04:51.124Z"
  - id: "DL-168"
    kind: "difficulty"
    description: "The first file edit command failed and had to be retried with python3."
    fp: "0d7218937601"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:04:51.166Z"
  - id: "DL-169"
    kind: "difficulty"
    description: "Shell quoting removed TypeScript string delimiters on the first python3 edit retry; the edit was retried with safe outer quoting."
    fp: "e16e1862c216"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:05:48.832Z"
  - id: "DL-170"
    kind: "difficulty"
    description: "Focused validation failed because a malformed nested project correctly raised the project codec error while the test expected only the outer registration codec wording."
    fp: "b460b48c04ba"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:10:06.135Z"
  - id: "DL-171"
    kind: "difficulty"
    description: "Focused controller validation failed because shell quoting stripped JSX attribute quotes from the generated test file."
    fp: "998475638da6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:12:50.567Z"
  - id: "INS-025"
    kind: "insight"
    description: "Focused controller validation exposed a test harness that consumed recovery fixtures during initial load and a whitespace-normalizing assertion that obscured exact payload bytes."
    fp: "b8ee7742fb9d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:13:38.686Z"
  - id: "DL-172"
    kind: "difficulty"
    description: "The first accessible App rewrite hit the same mixed shell/JSX quoting boundary and required a quote-homogeneous retry."
    fp: "2f5ca20276a0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:15:20.893Z"
  - id: "INS-026"
    kind: "insight"
    description: "Focused component validation surfaced BL-007 expectations that registration was absent and Open was the first tab stop; those tests now require BL-008 behavior."
    fp: "5cb06dcb3b31"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:16:20.061Z"
  - id: "DL-173"
    kind: "difficulty"
    description: "A recovery-cancel edit retry failed because a Python replacement embedded single-quoted TypeScript inside a single-quoted shell command."
    fp: "e21637687a15"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:18:29.329Z"
  - id: "DL-174"
    kind: "difficulty"
    description: "The Chromium gate failed to parse because Python materialized escaped newline literals as source newlines inside TypeScript strings."
    fp: "544c99893b49"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:20:46.923Z"
  - id: "DL-175"
    kind: "difficulty"
    description: "The real Chromium and cleanup gate required 41 seconds to complete."
    fp: "81086a64ea05"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:22:50.536Z"
  - id: "WIN-013"
    kind: "win"
    description: "A manual source inspection caught another materialized newline inside the generated documentation test before execution."
    fp: "b6fdf71c50ab"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:26:13.194Z"
  - id: "DL-176"
    kind: "difficulty"
    description: "Focused documentation validation failed and emitted an unusually large diff requiring targeted diagnosis."
    fp: "07bb1291a3f5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:26:57.499Z"
  - id: "DL-177"
    kind: "difficulty"
    description: "Full validation failed at the configured format check because eleven edited TypeScript files were not normalized."
    fp: "37775b39726b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:30:37.097Z"
  - id: "CONF-043"
    kind: "confusion"
    description: "Full validation still failed because two JSX test files remained noncanonical after the first formatter pass."
    fp: "bab93a8647ed"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:31:35.236Z"
  - id: "DL-178"
    kind: "difficulty"
    description: "Full validation reached strict typecheck and found a React 19 useRef initializer requirement plus one intentionally partial Response test double cast."
    fp: "f336db03f6a7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:32:27.941Z"
  - id: "INS-027"
    kind: "insight"
    description: "Full validation found the BL-006 construction union must be narrowed by property presence because failure variants intentionally have no status field."
    fp: "c9bfcea9c3a5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:33:42.125Z"
  - id: "DL-179"
    kind: "difficulty"
    description: "Full validation progressed beyond static checks but still failed later in the repository suite, requiring targeted output inspection."
    fp: "1d75241aebfd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:34:49.586Z"
  - id: "INS-028"
    kind: "insight"
    description: "Focused persistence documentation validation exposed additional BL-007 lifecycle phrases that must remain represented after the BL-008 section rewrite."
    fp: "b96704127518"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:35:34.665Z"
  - id: "DL-180"
    kind: "difficulty"
    description: "The complete repository validation suite required more than 30 seconds to finish."
    fp: "29741ed79ade"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:37:32.763Z"
  - id: "DL-181"
    kind: "difficulty"
    description: "Final full validation hit an unrelated timing race where the existing cancellation proof observed early exit instead of cancellation."
    fp: "41c7284acf45"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:39:53.734Z"
  - id: "WIN-014"
    kind: "win"
    description: "The repeated final full validation required more than 30 seconds and completed successfully."
    fp: "0988d2d9c420"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:41:46.197Z"
  - id: "WIN-015"
    kind: "win"
    description: "The evidence-synchronized final full validation required more than 30 seconds and completed successfully."
    fp: "9c8d5b615708"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:44:09.903Z"
  - id: "WIN-016"
    kind: "win"
    description: "The stable-evidence final validation required more than 30 seconds and completed successfully."
    fp: "9ce2fc666388"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:46:18.375Z"
  - id: "DL-182"
    kind: "difficulty"
    description: "Task breakdown exceeded the file viewer limit and required ranged reads."
    fp: "fdc88ebebcdc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T09:59:20.628Z"
  - id: "CONF-044"
    kind: "confusion"
    description: "The documented Python tool name was unavailable; repository edits required the installed python3 executable."
    fp: "fbf9895836b4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:02:31.050Z"
  - id: "DL-183"
    kind: "difficulty"
    description: "A generated whole-file edit corrupted the API test and required restoring then applying a safer edit."
    fp: "52d03d4d0039"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:06:50.858Z"
  - id: "INS-029"
    kind: "insight"
    description: "The repository checkout hook referenced unavailable git-personas but skipped safely."
    fp: "3600ace51a97"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:07:23.024Z"
  - id: "DL-184"
    kind: "difficulty"
    description: "Focused component validation exposed ambiguous test queries and duplicate Cancel controls during retry recovery."
    fp: "22d3e061ff2c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:11:59.356Z"
  - id: "DL-185"
    kind: "difficulty"
    description: "A cleanup contract file edit was rejected because a test template literal resembled shell expansion; the edit was rewritten without template syntax."
    fp: "e2213dbf253b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:14:54.045Z"
  - id: "DL-186"
    kind: "difficulty"
    description: "The root formatting check found style drift in six edited TypeScript files and required formatting edits."
    fp: "fd107aaf277c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:20:14.121Z"
  - id: "DL-187"
    kind: "difficulty"
    description: "Full validation failed and required diagnosis after the cleanup and component corrections."
    fp: "b92e5f7f8059"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:21:32.985Z"
  - id: "DL-188"
    kind: "difficulty"
    description: "Focused documentation validation exposed a stale BL-007 token after cleanup evidence wording was made precise."
    fp: "f59c0e544d57"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:23:04.231Z"
  - id: "CONF-045"
    kind: "confusion"
    description: "The first documentation correction revealed a second legacy token required in application docs rather than the root README."
    fp: "a526bd8117d5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:24:21.887Z"
  - id: "DL-189"
    kind: "difficulty"
    description: "The second full validation run failed after unit gates and required downstream browser diagnosis."
    fp: "17af0e91bbbc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:26:14.965Z"
  - id: "INS-030"
    kind: "insight"
    description: "The parallel browser failure exposed an inferred /proc enumeration race; the process-group probe needed name-only PID discovery to avoid transient lstat failures."
    fp: "ca10b4c95118"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:27:23.736Z"
  - id: "DL-190"
    kind: "difficulty"
    description: "Repository search required a fallback because the expected ripgrep command was unavailable."
    fp: "434bbc07806a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:41:51.828Z"
  - id: "DL-191"
    kind: "difficulty"
    description: "A planned test edit required backtracking because the python command alias was unavailable."
    fp: "bd4ab2368b80"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:42:55.836Z"
  - id: "DL-192"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis for unsupported registration media types."
    fp: "35d25230e126"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:43:37.682Z"
  - id: "COORD-033"
    kind: "coordination"
    description: "Full repository validation required a tool wait longer than 30 seconds."
    fp: "8eb0aec9804d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T10:47:50.235Z"
  - id: "DL-193"
    kind: "difficulty"
    description: "Plan artifacts exceeded the file viewer limit and required bounded range reads."
    fp: "09f2bd26ca07"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:34:33.794Z"
  - id: "CONF-046"
    kind: "confusion"
    description: "The environment exposed Node.js but not the expected python command for repository edits."
    fp: "dac01a514f7c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:38:47.831Z"
  - id: "DL-194"
    kind: "difficulty"
    description: "Shell quoting for a generated TypeScript file failed and required a safer bounded rewrite."
    fp: "341ab316043e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:39:54.174Z"
  - id: "SUGG-010"
    kind: "improvement-suggestion"
    description: "A multi-file edit encountered nested shell quoting and was split into simpler atomic edits."
    fp: "febfa4fc2d00"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:41:08.625Z"
  - id: "DL-195"
    kind: "difficulty"
    description: "A test fixture SQL literal conflicted with shell quoting and required a non-interpolated escaped template literal."
    fp: "859798224bcb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:42:57.882Z"
  - id: "DL-196"
    kind: "difficulty"
    description: "An application-wiring edit hit another nested-quote parse failure and required a quote-uniform retry."
    fp: "cf7c414349fb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:44:30.682Z"
  - id: "DL-197"
    kind: "difficulty"
    description: "Focused DELETE validation failed because Fastify autoload could not resolve a new runtime .js import from a TypeScript route."
    fp: "0743a0bac29d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:47:13.288Z"
  - id: "INS-031"
    kind: "insight"
    description: "The T-2 rerun exposed native malformed-URL handling outside plugin errors and overlapping SQLite transactions under eight-way close."
    fp: "ddef23cabdaf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:48:10.494Z"
  - id: "DL-198"
    kind: "difficulty"
    description: "The large hook type edit failed during quote normalization and was retried as uniform triple-quoted replacements."
    fp: "c99592bcf6cf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:51:27.030Z"
  - id: "DL-199"
    kind: "difficulty"
    description: "The App wiring edit failed on mixed quote cleanup and was split into uniform replacements."
    fp: "495d563ccfd0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:55:17.951Z"
  - id: "DL-200"
    kind: "difficulty"
    description: "A JSX attribute literal was stripped by shell parsing and required character-safe construction."
    fp: "3372037b27e9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:56:28.412Z"
  - id: "DL-201"
    kind: "difficulty"
    description: "Focused modal validation failed because accessible-name whitespace normalization differed from raw text; the large failure output also required a bounded follow-up read."
    fp: "dd04fd0b5097"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T11:59:31.776Z"
  - id: "DL-202"
    kind: "difficulty"
    description: "Focused non-mutation validation failed because a generated evidence newline became an unterminated TypeScript literal."
    fp: "4757b058686d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:01:42.716Z"
  - id: "COORD-034"
    kind: "coordination"
    description: "Owned Chromium close success, controlled fault, and cleanup validation required a bounded wait longer than 30 seconds."
    fp: "6acdf77dd276"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:05:42.118Z"
  - id: "DL-203"
    kind: "difficulty"
    description: "The multi-document update contained JSON quote characters that escaped shell boundaries and was retried with quote-free contract notation."
    fp: "9540f0d661a8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:07:58.383Z"
  - id: "DL-204"
    kind: "difficulty"
    description: "Focused documentation validation failed on formatted timeout tokens, and the oversized diff required a bounded failure-summary read."
    fp: "4e2ef188e9e9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:10:38.382Z"
  - id: "INS-032"
    kind: "insight"
    description: "The documentation rerun found that one fixed safe close-message inventory was not yet recorded."
    fp: "2c9cfd389f92"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:11:34.740Z"
  - id: "WIN-017"
    kind: "win"
    description: "The complete close-project focused gate passed after a bounded browser wait longer than 30 seconds."
    fp: "b37a7b4523c1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:13:12.650Z"
  - id: "DL-205"
    kind: "difficulty"
    description: "Full validation failed at the root format check because newly edited TypeScript files were not yet Prettier-normalized."
    fp: "abf2d145ce1d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:14:02.575Z"
  - id: "DL-206"
    kind: "difficulty"
    description: "The full rerun reached strict type checking and exposed one intentionally partial Response fixture cast plus two lint warnings."
    fp: "e14c09dd77d3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:15:04.328Z"
  - id: "DL-207"
    kind: "difficulty"
    description: "The next full rerun found one corrective test edit still needed configured formatting."
    fp: "3b94ed338ef3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:16:19.011Z"
  - id: "DL-208"
    kind: "difficulty"
    description: "Strict API type checking then found the Fastify plugin error value needed an explicit safe status-code guard."
    fp: "b7619614b066"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:17:08.402Z"
  - id: "INS-033"
    kind: "insight"
    description: "The full unit suite exposed an architecture source sensor collision: Promise.resolve matched the existing prohibition on path resolve calls."
    fp: "165ca735f72f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:18:29.905Z"
  - id: "COORD-035"
    kind: "coordination"
    description: "The full validation attempt required a bounded wait longer than 30 seconds before reporting the architecture sensor failure."
    fp: "d754e0fce98a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:18:42.882Z"
  - id: "DL-209"
    kind: "difficulty"
    description: "The full suite passed behavior tests but branch coverage reached 79.85%, just below the configured 80% threshold."
    fp: "2e1eee8a6ded"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:20:21.954Z"
  - id: "COORD-036"
    kind: "coordination"
    description: "The coverage-reporting full validation attempt required a bounded wait longer than 30 seconds."
    fp: "807148a1e7d2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:20:34.693Z"
  - id: "DL-210"
    kind: "difficulty"
    description: "The coverage-test correction needed one final configured formatting pass before full validation could continue."
    fp: "24cbe0a5ef61"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:21:48.979Z"
  - id: "COORD-037"
    kind: "coordination"
    description: "Final validation output exceeded the viewer limit and required a bounded summary read."
    fp: "61e57a33d87f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:24:08.546Z"
  - id: "WIN-018"
    kind: "win"
    description: "Final full validation passed after a bounded wait longer than 30 seconds."
    fp: "caab7b13b07d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:24:08.578Z"
  - id: "CONF-047"
    kind: "confusion"
    description: "Validation left an unexpected generated harnessability run that is outside Issue 21 and must not alter the immutable baseline aliases."
    fp: "ed7f122f7e67"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:25:47.025Z"
  - id: "COORD-038"
    kind: "coordination"
    description: "Requested branch name differed from the existing clean local implementation branch, requiring a safe local rename before resuming."
    fp: "2ede93f98288"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:44:10.659Z"
  - id: "CONF-048"
    kind: "confusion"
    description: "The requested branch name was initially misread and required a second local rename."
    fp: "e117ffe5b28c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:44:44.592Z"
  - id: "DL-211"
    kind: "difficulty"
    description: "The preferred repository search utility was unavailable, requiring a backtrack to portable grep/find inspection."
    fp: "9ef4aee1e886"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:45:16.566Z"
  - id: "DL-212"
    kind: "difficulty"
    description: "The generic Python executable was absent and implementation had to retry with python3."
    fp: "a32962235856"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:54:14.017Z"
  - id: "DL-213"
    kind: "difficulty"
    description: "Focused validation failed while adding the close client branch matrix because an it.each table was missing its method call."
    fp: "e342031aef14"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:58:42.453Z"
  - id: "INS-034"
    kind: "insight"
    description: "Focused close client validation exposed an engine-specific non-JSON parser message, so the test needed a semantic assertion instead of an error-class string."
    fp: "739a03f0cf57"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T12:59:47.466Z"
  - id: "DL-214"
    kind: "difficulty"
    description: "Focused component validation caught an over-broad test edit that replaced the original render container reference."
    fp: "216ae6274feb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T13:01:52.704Z"
  - id: "INS-035"
    kind: "insight"
    description: "Focused manifest validation exposed canonical-path uniqueness in the combined fixture because all scenario rows initially reused one path."
    fp: "7b6f085c5488"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T13:04:10.623Z"
  - id: "DL-215"
    kind: "difficulty"
    description: "The root format-check recipe found four newly edited test files that required repository-standard formatting."
    fp: "2d5821743ecc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T13:10:51.116Z"
  - id: "DL-216"
    kind: "difficulty"
    description: "Full validation failed at strict web type checking because a table-defined throwing pre-send callback needed an explicit boolean return type."
    fp: "73be942c8d5d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T13:12:32.982Z"
  - id: "CONF-049"
    kind: "confusion"
    description: "The first type correction targeted the throwing callback, but strict inference still required the neighboring false-return callback to be annotated too."
    fp: "241536babe37"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T13:13:33.611Z"
  - id: "WIN-019"
    kind: "win"
    description: "The final close-owned database, sidecar, and fixture residual scan was empty after the repeated focused and full gates."
    fp: "46d5cf3de060"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T13:17:18.148Z"
  - id: "DL-217"
    kind: "difficulty"
    description: "Issue 23 pre-flight reproduced the workbench early-exit versus readiness-timeout race after prior stress coverage"
    fp: "d7243b58f22a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T13:56:28.809Z"
  - id: "DL-218"
    kind: "difficulty"
    description: "Reading the research brief with an oversized line range required a retry."
    fp: "947887a02d7f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:32:31.201Z"
  - id: "INS-036"
    kind: "insight"
    description: "The environment exposes python3 but no python executable."
    fp: "ddc7ba2f7b3e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:33:55.270Z"
  - id: "DL-219"
    kind: "difficulty"
    description: "The Phase 0 edit command required a retry with python3."
    fp: "6476335ce589"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:33:55.284Z"
  - id: "INS-037"
    kind: "insight"
    description: "The repository had no existing root contract-test files to reuse."
    fp: "9e5968f0cecf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:40:09.019Z"
  - id: "DL-220"
    kind: "difficulty"
    description: "Focused RPIV contract validation found no tests because the project filter root was misconfigured."
    fp: "9027cfc43b6e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:42:19.525Z"
  - id: "DL-221"
    kind: "difficulty"
    description: "Focused RPIV contract validation exposed strict inventory and profile-source mismatches."
    fp: "7f9fd80313cb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:43:16.720Z"
  - id: "DL-222"
    kind: "difficulty"
    description: "Strict RPIV contract validator corrections required another focused pass."
    fp: "d9e6fbd0b5bd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:44:19.523Z"
  - id: "DL-223"
    kind: "difficulty"
    description: "A brittle validator source replacement aborted before writing its correction."
    fp: "c5da66854d8a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:45:12.251Z"
  - id: "DL-224"
    kind: "difficulty"
    description: "The first harness ownership search was too broad and required a tracked-document scope retry."
    fp: "d8ee0ccc1e94"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:49:29.780Z"
  - id: "DL-225"
    kind: "difficulty"
    description: "Full validation failed because new contract fixtures and tests required repository formatting."
    fp: "b782992d97e1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:50:08.405Z"
  - id: "DL-226"
    kind: "difficulty"
    description: "Programmatic formatting missed the repository Prettier configuration and full validation required another correction."
    fp: "7cb21b85b6ce"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:51:02.932Z"
  - id: "INS-038"
    kind: "insight"
    description: "Full-suite load exposed cancellation cleanup terminating the child before its identity sensor completed."
    fp: "c9a07e74e4dc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:52:33.519Z"
  - id: "DL-227"
    kind: "difficulty"
    description: "Full validation exposed one uncovered cancellation identity branch at the 80 percent coverage boundary."
    fp: "39b52eb7c812"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:53:42.074Z"
  - id: "DL-228"
    kind: "difficulty"
    description: "The new root-cause regression test needed repository formatting before the full gate could continue."
    fp: "31147a8aada7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:54:33.705Z"
  - id: "INS-039"
    kind: "insight"
    description: "The successful full validation gate required a tool wait over 30 seconds."
    fp: "14f0f8c249a4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T14:56:38.221Z"
  - id: "DL-229"
    kind: "difficulty"
    description: "The repository verification expected `rg`, but the executable was unavailable."
    fp: "f687bb9dce70"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:05:15.336Z"
  - id: "CONF-050"
    kind: "confusion"
    description: "The first tracked-document contradiction scan was too broad and produced an unwieldy result."
    fp: "f3e4b2d863c2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:05:51.668Z"
  - id: "INS-040"
    kind: "insight"
    description: "The contract matrix passed a marker-only APS inventory, so normative process argument and tool grammar required manual comparison."
    fp: "b42a371e0413"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:06:58.479Z"
  - id: "DL-230"
    kind: "difficulty"
    description: "The authoritative just verify run waited over 30 seconds while completing the Playwright gate."
    fp: "51805008f22e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:10:22.263Z"
  - id: "COORD-039"
    kind: "coordination"
    description: "Verifier feedback required backtracking to correct APS signature, tool, lifecycle, and validation contracts."
    fp: "b3d719ffa8ba"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:13:13.800Z"
  - id: "DL-231"
    kind: "difficulty"
    description: "Repository search required backtracking because ripgrep was unavailable in the configured environment."
    fp: "280af6dc66f8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:13:57.798Z"
  - id: "DL-232"
    kind: "difficulty"
    description: "Repository inspection required another backtrack because the Python executable was also unavailable."
    fp: "442819b0c71b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:14:46.982Z"
  - id: "DL-233"
    kind: "difficulty"
    description: "A targeted validator edit failed because the expected source block did not match exactly and required inspection."
    fp: "4a64f34c2e19"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:23:08.486Z"
  - id: "DL-234"
    kind: "difficulty"
    description: "Focused RPIV validation exposed two regression assertions whose executable source expectations required correction."
    fp: "6a4b1c28a5d7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:28:44.805Z"
  - id: "DL-235"
    kind: "difficulty"
    description: "Task-status editing required backtracking after shell escaping corrupted the intended regular expression."
    fp: "7cefe08f1ac6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:30:29.459Z"
  - id: "DL-236"
    kind: "difficulty"
    description: "Focused RPIV validation failed on a malformed generated newline literal in the fixture evidence writer."
    fp: "3c7e0a6e3507"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:33:24.497Z"
  - id: "DL-237"
    kind: "difficulty"
    description: "Full validation failed at the formatting gate for the newly added contract validator and tests."
    fp: "8aed441b7d8a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:35:04.182Z"
  - id: "INS-041"
    kind: "insight"
    description: "The complete just verify gate required a tool wait exceeding thirty seconds before returning success."
    fp: "f15f40081061"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:37:20.517Z"
  - id: "DL-238"
    kind: "difficulty"
    description: "Final full validation failed because API branch coverage fluctuated to 79.97 percent below the 80 percent gate."
    fp: "650fffd73d45"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:39:13.886Z"
  - id: "DL-239"
    kind: "difficulty"
    description: "The expected rg search executable was unavailable during adapter signature inspection."
    fp: "28f9df822e93"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:50:08.106Z"
  - id: "INS-042"
    kind: "insight"
    description: "The authoritative just verify run waited over 30 seconds for the full Playwright gate."
    fp: "829f25669c8a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:55:30.102Z"
  - id: "DL-240"
    kind: "difficulty"
    description: "The broad node_modules tool-schema search produced unusable output and required a narrower inspection."
    fp: "5256301b275d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:56:42.181Z"
  - id: "DL-241"
    kind: "difficulty"
    description: "The expected python command was unavailable while resolving the action plan, requiring a retry with available tooling."
    fp: "410438fcd57a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T15:59:18.633Z"
  - id: "DL-242"
    kind: "difficulty"
    description: "The expected ripgrep command was unavailable while locating architecture decisions, requiring a retry with grep."
    fp: "17ea5ba99417"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:00:40.666Z"
  - id: "DL-243"
    kind: "difficulty"
    description: "Full validation failed at the formatting gate after the validator edits and required manual style correction."
    fp: "cf9edd6f4dd2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:10:29.956Z"
  - id: "COORD-040"
    kind: "coordination"
    description: "The formatting-gate failure required a correction and retry of the repository full validation."
    fp: "ea639bf15c2f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:10:57.855Z"
  - id: "DL-244"
    kind: "difficulty"
    description: "Full validation still failed formatting after the first correction attempt, requiring diagnosis of the formatter invocation."
    fp: "2a5211065034"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:11:35.208Z"
  - id: "INS-043"
    kind: "insight"
    description: "The complete repository validation gate required a tool wait over 30 seconds before returning its successful result."
    fp: "3bbb324b879e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:14:18.921Z"
  - id: "DL-245"
    kind: "difficulty"
    description: "Final full validation returned a nonzero result after passing early gates and required inspection of the retained output."
    fp: "837748fd7257"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:17:55.861Z"
  - id: "COORD-041"
    kind: "coordination"
    description: "The owned-cleanup browser sensor failed despite removing its resources, requiring a clean full-gate retry to classify the transient result."
    fp: "83864dfaef9b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:18:39.106Z"
  - id: "INS-044"
    kind: "insight"
    description: "The clean full-gate retry required another tool wait over 30 seconds before returning a successful result."
    fp: "fff27b698d8a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:20:11.685Z"
  - id: "DL-246"
    kind: "difficulty"
    description: "Documentation contradiction search was too broad and required a scoped retry."
    fp: "6703a2362662"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:25:24.868Z"
  - id: "DL-247"
    kind: "difficulty"
    description: "Exact correction commit output exceeded the reader limit and required ranged inspection."
    fp: "28800f3ce106"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:26:24.925Z"
  - id: "INS-045"
    kind: "insight"
    description: "Independent just verify execution required more than 30 seconds to complete."
    fp: "007c30a167c9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:28:11.962Z"
  - id: "CONF-051"
    kind: "confusion"
    description: "The documented python command was unavailable; the environment exposes python3 instead."
    fp: "79c6f1e4d3a2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:30:15.871Z"
  - id: "CONF-052"
    kind: "confusion"
    description: "GitHub checkbox count probe returned zero despite the checked issue body and required a corrected query."
    fp: "8d7f91433e57"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:33:47.814Z"
  - id: "DL-248"
    kind: "difficulty"
    description: "The repository search command failed because ripgrep is unavailable, requiring a fallback search tool."
    fp: "7ceabf410d07"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:46:41.986Z"
  - id: "DL-249"
    kind: "difficulty"
    description: "The workbench proof document exceeded the view size limit, requiring bounded range reads."
    fp: "0933baa65bab"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:47:11.309Z"
  - id: "CONF-053"
    kind: "confusion"
    description: "A requested document range exceeded the actual file length, requiring corrected bounded reads."
    fp: "c458330bd440"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:47:35.440Z"
  - id: "CONF-054"
    kind: "confusion"
    description: "The API README range exceeded its actual line count, requiring reliance on the completed first read."
    fp: "36b232fbd266"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:49:07.456Z"
  - id: "DL-250"
    kind: "difficulty"
    description: "A frontend lifecycle source read exceeded the view limit, requiring narrower symbol-focused inspection."
    fp: "11a8fb1eeced"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:50:06.102Z"
  - id: "DL-251"
    kind: "difficulty"
    description: "A broad persistence and logging search produced oversized output, requiring narrower targeted searches."
    fp: "b85912123046"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:51:01.786Z"
  - id: "DL-252"
    kind: "difficulty"
    description: "The research brief write failed because the python command is unavailable; python3 is required."
    fp: "1da99a7dc9dc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:54:05.924Z"
  - id: "DL-253"
    kind: "difficulty"
    description: "The initial cross-repository grep produced oversized output, requiring narrower evidence searches."
    fp: "270687632d71"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:55:42.418Z"
  - id: "DL-254"
    kind: "difficulty"
    description: "The harness runtime-reference grep produced oversized output, requiring focused harness file reads."
    fp: "2bf86252dca6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:55:42.536Z"
  - id: "INS-046"
    kind: "insight"
    description: "I estimated the research line range from file size, but the brief used long lines and had only 102 lines."
    fp: "e7d9b5905f35"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:57:54.767Z"
  - id: "DL-255"
    kind: "difficulty"
    description: "The tool guidance implied python was available, but this workspace exposes only python3 for scripted file edits."
    fp: "925c4c8ad39a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T16:59:46.069Z"
  - id: "INS-047"
    kind: "insight"
    description: "The branch arrived with uncommitted Plan and architecture artifacts that must be preserved."
    fp: "2ac4f3c5ef49"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:07:06.743Z"
  - id: "DL-256"
    kind: "difficulty"
    description: "The expected python executable was unavailable; repository edits require python3 instead."
    fp: "b5918fa8d931"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:08:07.685Z"
  - id: "DL-257"
    kind: "difficulty"
    description: "The rg search executable was unavailable; repository inspection requires grep and find."
    fp: "a96d0e13d853"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:08:46.646Z"
  - id: "DL-258"
    kind: "difficulty"
    description: "Focused validation failed because fake collision exits did not win the readiness race."
    fp: "9ccc87bef92d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:13:28.391Z"
  - id: "DL-259"
    kind: "difficulty"
    description: "The shell safety filter rejected a long literal file edit, requiring a safer chunked write method."
    fp: "e2a8e49c5ad8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:19:46.161Z"
  - id: "DL-260"
    kind: "difficulty"
    description: "Focused validation failed because generated test newline escapes became an unterminated string."
    fp: "d0eccf8791db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:21:42.330Z"
  - id: "INS-048"
    kind: "insight"
    description: "Focused validation found the real code-server health body differed from the inferred contract."
    fp: "795aa0af25d8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:24:36.477Z"
  - id: "DL-261"
    kind: "difficulty"
    description: "The trailing-slash health retry still returned non-JSON content from the real process."
    fp: "c731e3e70e8b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:26:00.364Z"
  - id: "DL-262"
    kind: "difficulty"
    description: "Documentation test generation failed because a nested quote escaped the shell literal."
    fp: "f2b3ccb0d84e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:31:23.106Z"
  - id: "SUGG-011"
    kind: "improvement-suggestion"
    description: "Focused validation found the runtime runbook lacked the exact memory-only contract phrase."
    fp: "6a2229f771db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:32:18.978Z"
  - id: "DL-263"
    kind: "difficulty"
    description: "The residual audit failed because its workspace process resolved the evidence path below apps/api."
    fp: "76610b967e20"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:33:20.221Z"
  - id: "DL-264"
    kind: "difficulty"
    description: "Full validation failed on repository formatting for the new runtime files."
    fp: "0be1254ad703"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:35:48.874Z"
  - id: "DL-265"
    kind: "difficulty"
    description: "Full validation exposed incomplete findById interface typing and one duplicate test-double key."
    fp: "718a77af6b1a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:36:33.727Z"
  - id: "DL-266"
    kind: "difficulty"
    description: "Full validation missed the 80 percent branch threshold after adding injectable runtime boundaries."
    fp: "77c8669164e6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:37:40.312Z"
  - id: "DL-267"
    kind: "difficulty"
    description: "Focused validation showed the raw TCP health fixture was unreliable under parallel test load."
    fp: "a1ddf28595e7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:39:54.411Z"
  - id: "INS-049"
    kind: "insight"
    description: "The corrected health fixture still timed out because the probe connection remained open during server close."
    fp: "d228f801dab3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T17:40:49.174Z"
  - id: "DL-268"
    kind: "difficulty"
    description: "Focused runtime process validation timed out while closing the real loopback health fixture and required diagnosis."
    fp: "280e762ec0da"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:30:10.128Z"
  - id: "DL-269"
    kind: "difficulty"
    description: "The planned repository edit backtracked because the environment does not provide the python executable alias."
    fp: "21eb1f4fdbe2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:30:26.773Z"
  - id: "INS-050"
    kind: "insight"
    description: "Focused runtime process validation exposed that net.Server lacks the HTTP-only closeAllConnections helper."
    fp: "8453ae694390"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:30:46.527Z"
  - id: "DL-270"
    kind: "difficulty"
    description: "Full validation failed at the repository formatting gate after runtime contract test edits and required correction."
    fp: "7a4789f9f57b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:34:00.546Z"
  - id: "DL-271"
    kind: "difficulty"
    description: "Full validation reached the test suite but branch coverage fell to 79.86 percent and required targeted runtime coverage."
    fp: "b99787f7f84b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:34:48.239Z"
  - id: "DL-272"
    kind: "difficulty"
    description: "Focused repository format checking rejected the new runtime fallback coverage layout and required a manual style correction."
    fp: "d3742a714690"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:35:29.206Z"
  - id: "DL-273"
    kind: "difficulty"
    description: "Full validation branch coverage remained below threshold at 79.8 percent, so broader runtime branch tests are required."
    fp: "86913e0a02e5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:36:20.453Z"
  - id: "DL-274"
    kind: "difficulty"
    description: "Repository formatting rejected the new default-sleep cancellation test layout and required another constrained manual edit."
    fp: "b73daa2a4265"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:37:20.065Z"
  - id: "DL-275"
    kind: "difficulty"
    description: "Full validation improved branch coverage to 79.92 percent but still missed the enforced threshold by a narrow margin."
    fp: "befee04150ec"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:38:18.416Z"
  - id: "INS-051"
    kind: "insight"
    description: "Full validation exposed an intermittent designated startup status under parallel load, requiring bounded polling of transient non-ready health responses."
    fp: "35f7782455af"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:39:40.278Z"
  - id: "INS-052"
    kind: "insight"
    description: "Full validation revealed resource-contention flakiness in an existing workbench cancellation proof while designated runtime tests ran concurrently."
    fp: "b9975eeccc2b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:41:23.027Z"
  - id: "DL-276"
    kind: "difficulty"
    description: "Repository formatting rejected the designated-test gating expression and required a small manual layout fix."
    fp: "8bac91c21ee3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:42:06.701Z"
  - id: "INS-053"
    kind: "insight"
    description: "Serializing the designated proof removed necessary node-adapter coverage from the package run, revealing a validation design conflict."
    fp: "1280dcdf474d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:43:45.625Z"
  - id: "DL-277"
    kind: "difficulty"
    description: "Repository formatting rejected the real-node fake boundary test layout and required a constrained style-only correction."
    fp: "3dfac2ed2f99"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:44:42.999Z"
  - id: "CONF-055"
    kind: "confusion"
    description: "A second format check showed the inferred Prettier layout for the fake executable path was still incorrect."
    fp: "4d62204d78fb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:45:17.261Z"
  - id: "DL-278"
    kind: "difficulty"
    description: "Final full validation showed branch coverage remained nondeterministic at 79.88 percent, requiring additional deterministic margin."
    fp: "11f86c685a2b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:49:45.701Z"
  - id: "DL-279"
    kind: "difficulty"
    description: "Large documentation diff output required a second ranged read to complete inspection."
    fp: "799793928241"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-11T23:58:04.163Z"
  - id: "DL-280"
    kind: "difficulty"
    description: "The unavailable python alias required retrying the source edit with python3."
    fp: "9004b8cdd81f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:02:44.721Z"
  - id: "DL-281"
    kind: "difficulty"
    description: "Focused runtime ownership validation failed and required diagnosis of cleanup callback semantics."
    fp: "f7b2640fdd04"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:05:32.338Z"
  - id: "DL-282"
    kind: "difficulty"
    description: "Executable acceptance validation exposed that the health fake bypassed real collision detection."
    fp: "c2d038d690b4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:09:54.625Z"
  - id: "DL-283"
    kind: "difficulty"
    description: "The combined documentation edit was blocked and required smaller non-dynamic edit commands."
    fp: "c32a8cde5e22"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:11:52.319Z"
  - id: "DL-284"
    kind: "difficulty"
    description: "Full validation failed on repository formatting and required correction before rerun."
    fp: "0754dbe852fd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:14:51.271Z"
  - id: "DL-285"
    kind: "difficulty"
    description: "Full validation exposed cross-test host-process contention from the executable acceptance episode."
    fp: "9ff5a676c036"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:15:51.529Z"
  - id: "DL-286"
    kind: "difficulty"
    description: "The acceptance gate edit missed the formatted test shape and required a range-based retry."
    fp: "0603800740ea"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:18:47.636Z"
  - id: "DL-287"
    kind: "difficulty"
    description: "Final full validation found retained JSON formatting drift after artifact refresh."
    fp: "d2850c09aef6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:20:46.699Z"
  - id: "DL-288"
    kind: "difficulty"
    description: "Final full validation fell below branch coverage because the skipped host matrix imported an uncovered evidence helper."
    fp: "b427a3cf15fe"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:21:44.692Z"
  - id: "CONF-056"
    kind: "confusion"
    description: "Repository search found no established V8 file-ignore pattern for the acceptance evidence helper."
    fp: "40dcd33c066b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:22:03.747Z"
  - id: "DL-289"
    kind: "difficulty"
    description: "The first full validation attempt required a tool wait over 30 seconds."
    fp: "21d3c3b7acaf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:32:34.222Z"
  - id: "DL-290"
    kind: "difficulty"
    description: "The second full validation attempt required a tool wait over 30 seconds."
    fp: "d291caf3b07e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:32:37.393Z"
  - id: "DL-291"
    kind: "difficulty"
    description: "The third full validation attempt required a tool wait over 30 seconds."
    fp: "01994c8ddd17"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:32:40.173Z"
  - id: "DL-292"
    kind: "difficulty"
    description: "The fourth full validation attempt required a tool wait over 30 seconds."
    fp: "1c7de5994218"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:32:43.158Z"
  - id: "DL-293"
    kind: "difficulty"
    description: "The final full validation attempt required a tool wait over 30 seconds."
    fp: "d11dd4a46e6f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:32:46.416Z"
  - id: "DL-294"
    kind: "difficulty"
    description: "The documented inspection step had to backtrack because rg is unavailable in the verifier environment."
    fp: "191a562217ab"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:35:30.028Z"
  - id: "DL-295"
    kind: "difficulty"
    description: "The authoritative just verify run required more than 30 seconds while completing all configured gates."
    fp: "0e0d95d77c7a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:37:52.432Z"
  - id: "DL-296"
    kind: "difficulty"
    description: "Creating the pull request body had to backtrack because the python executable is unavailable while python3 is expected."
    fp: "d7992cca1d4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:39:06.582Z"
  - id: "DL-297"
    kind: "difficulty"
    description: "The combined documentation diff exceeded tool output limits, requiring direct per-file documentation reads."
    fp: "d07d86264f1c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:40:59.168Z"
  - id: "DL-298"
    kind: "difficulty"
    description: "The successful full validation output exceeded tool display limits, requiring targeted summary inspection."
    fp: "d5474f5f06c4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T00:41:07.654Z"
  - id: "DL-299"
    kind: "difficulty"
    description: "Repository search expected ripgrep, but the rg executable is unavailable in this environment."
    fp: "78354dd96073"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:06:45.586Z"
  - id: "COORD-042"
    kind: "coordination"
    description: "After ripgrep failed, repository searches had to be retried with grep."
    fp: "5147dd3d34e5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:06:54.312Z"
  - id: "CONF-057"
    kind: "confusion"
    description: "Searching the installed code-server tree for reverse-proxy and base-path documentation returned no matches."
    fp: "45dff00df622"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:07:50.160Z"
  - id: "DL-300"
    kind: "difficulty"
    description: "A dependency trace referenced the wrong temporary output filename and required a direct retry."
    fp: "b7a90732ddca"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:07:58.660Z"
  - id: "DL-301"
    kind: "difficulty"
    description: "Writing the research brief expected python, but only the python3 executable is available in this environment."
    fp: "2a54a9d385d6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:12:41.370Z"
  - id: "COORD-043"
    kind: "coordination"
    description: "The unavailable python alias required retrying the research write with python3."
    fp: "db49456c60d3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:12:58.277Z"
  - id: "DL-302"
    kind: "difficulty"
    description: "Research brief exceeded the file viewer limit and required bounded range retries."
    fp: "ddb4d9943968"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:16:06.530Z"
  - id: "DL-303"
    kind: "difficulty"
    description: "Guessed source ranges exceeded file lengths and required adjusted inspection."
    fp: "5075d54a02fd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:16:48.859Z"
  - id: "DL-304"
    kind: "difficulty"
    description: "Workbench proof documentation exceeded the viewer limit and needed focused section reads."
    fp: "49022cd1baf8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:17:12.314Z"
  - id: "DL-305"
    kind: "difficulty"
    description: "The documented python executable was unavailable; file creation requires python3."
    fp: "3b67e8ef4b9e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:21:07.987Z"
  - id: "SUGG-012"
    kind: "improvement-suggestion"
    description: "Manual base64 artifact creation introduced corrupted Markdown tokens and required replacement."
    fp: "254626940a45"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:22:58.205Z"
  - id: "DL-306"
    kind: "difficulty"
    description: "Plan validation failed without diagnostics at an assertion and required targeted parser debugging."
    fp: "c624cec75317"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:29:50.659Z"
  - id: "INS-054"
    kind: "insight"
    description: "Repository layout required backtracking from inferred runtime subdirectories to root-level API modules."
    fp: "74f81bd86044"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:32:25.199Z"
  - id: "DL-307"
    kind: "difficulty"
    description: "The documented Python tool alias was unavailable, so file generation required the installed Node runtime."
    fp: "0ae126a11589"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:37:14.438Z"
  - id: "DL-308"
    kind: "difficulty"
    description: "Focused validation failed because Fastify autoload could not resolve the new TypeScript proxy contract module."
    fp: "cf744dcb5458"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:43:12.641Z"
  - id: "INS-055"
    kind: "insight"
    description: "Repeated focused validation showed dynamic Fastify route loading bypassed source-level extension remapping."
    fp: "5727d2a574fd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:43:54.971Z"
  - id: "INS-056"
    kind: "insight"
    description: "A five-second focused-test tail exposed a leaked rejected-redirect response before explicit socket auditing."
    fp: "2c559033246a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:45:52.591Z"
  - id: "DL-309"
    kind: "difficulty"
    description: "Focused WebSocket validation exposed an upstream pending-handshake socket that survived client cancellation."
    fp: "4590cfd99522"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:47:31.965Z"
  - id: "INS-057"
    kind: "insight"
    description: "Retrying pending-handshake cancellation showed Node did not emit the expected raw request or socket events."
    fp: "4d49808c89bf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:48:07.610Z"
  - id: "DL-310"
    kind: "difficulty"
    description: "The corrected barrier revealed two distinct pending fixture sockets, requiring explicit upstream handshake abort ownership."
    fp: "7e211e9d4273"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:48:53.426Z"
  - id: "DL-311"
    kind: "difficulty"
    description: "Observable fixture sockets still remained after timeout and cancellation despite resumed server-side reads."
    fp: "cbd55ae77581"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:49:45.836Z"
  - id: "DL-312"
    kind: "difficulty"
    description: "The first real stable-route navigation returned an ambiguous typed 502 and required runtime-proxy diagnosis."
    fp: "62e78f246ac2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:55:31.476Z"
  - id: "DL-313"
    kind: "difficulty"
    description: "The designated Chromium validation took over thirty seconds while exercising all repository browser scenarios."
    fp: "3c2cbd76d143"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:55:31.511Z"
  - id: "DL-314"
    kind: "difficulty"
    description: "The redirected Chromium rerun again exceeded thirty seconds across the complete browser suite."
    fp: "a19580c0a9c1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:57:19.413Z"
  - id: "DL-315"
    kind: "difficulty"
    description: "Stable navigation loaded the workbench shell but Explorer never showed the project sentinel within its bound."
    fp: "384034a35620"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:57:20.697Z"
  - id: "DL-316"
    kind: "difficulty"
    description: "The third designated Chromium run again exceeded thirty seconds across unrelated browser proofs."
    fp: "59855df45fd4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T01:58:42.198Z"
  - id: "DL-317"
    kind: "difficulty"
    description: "The diagnostic Chromium run exceeded thirty seconds while collecting bounded browser transport failures."
    fp: "69985dd45b4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:00:47.649Z"
  - id: "DL-318"
    kind: "difficulty"
    description: "Focused HTTP validation failed because trusted origin headers intentionally replaced prior stripped-header expectations."
    fp: "45bb0794fb8f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:01:14.420Z"
  - id: "DL-319"
    kind: "difficulty"
    description: "The stable-origin Chromium rerun exceeded thirty seconds while all other browser checks also executed."
    fp: "edd2d211a355"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:02:38.798Z"
  - id: "DL-320"
    kind: "difficulty"
    description: "Rebuilt stable origin metadata did not prevent abnormal remote-channel WebSocket closure in real code-server."
    fp: "35add23f5a75"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:02:38.921Z"
  - id: "DL-321"
    kind: "difficulty"
    description: "The proxy-diagnostic Chromium run exceeded thirty seconds before exposing a pre-bridge failure gap."
    fp: "ff937cdfbc2f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:04:15.450Z"
  - id: "DL-322"
    kind: "difficulty"
    description: "The precommit-classification Chromium run again exceeded thirty seconds across the complete suite."
    fp: "c8950e338e4c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:05:47.087Z"
  - id: "INS-058"
    kind: "insight"
    description: "Repeated websocket-refused events without listener diagnostics narrowed failure to synchronous upstream client construction."
    fp: "1f4cf17db7a3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:05:47.148Z"
  - id: "INS-059"
    kind: "insight"
    description: "Source inspection revealed prior handshake fixes had missed double-quoted listeners and headers."
    fp: "6f83d6618d4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:07:47.793Z"
  - id: "DL-323"
    kind: "difficulty"
    description: "The synchronous-classification Chromium run exceeded thirty seconds before another real handshake failure."
    fp: "1eb8cccc5e0c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:07:47.832Z"
  - id: "INS-060"
    kind: "insight"
    description: "Real code-server opened two transport channels per navigation, requiring workflow attempts to be counted separately."
    fp: "cc5b61c5c0f3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:08:56.364Z"
  - id: "DL-324"
    kind: "difficulty"
    description: "The corrected-handshake Chromium suite exceeded thirty seconds while completing all three functional navigations."
    fp: "872bc8ca05b0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:08:56.405Z"
  - id: "DL-325"
    kind: "difficulty"
    description: "The reconnect-count Chromium suite exceeded thirty seconds before URL-scope validation completed."
    fp: "2695cef1fde2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:10:20.785Z"
  - id: "INS-061"
    kind: "insight"
    description: "Code-server made an unrelated Open VSX request, so stable-route evidence needed local operation scoping."
    fp: "f47090c08f4c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:10:21.092Z"
  - id: "INS-062"
    kind: "insight"
    description: "WebSocket URL origins use the ws scheme and require same-origin comparison against the mapped HTTP origin."
    fp: "9e0f94bb5514"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:11:36.954Z"
  - id: "DL-326"
    kind: "difficulty"
    description: "The URL-scoped Chromium suite exceeded thirty seconds before transport-origin comparison."
    fp: "6f3b42286d64"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:11:36.980Z"
  - id: "WIN-020"
    kind: "win"
    description: "The successful designated Chromium gate took over thirty seconds while proving three stable-route workflows and cleanup."
    fp: "e3e52f647182"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:12:46.476Z"
  - id: "DL-327"
    kind: "difficulty"
    description: "Focused residual validation rejected an await expression used inside an async default parameter."
    fp: "81de0aadb96f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:14:17.963Z"
  - id: "DL-328"
    kind: "difficulty"
    description: "Focused documentation validation showed the full verify recipe had not received the planned stable-route gate."
    fp: "e824987a28bd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:16:44.977Z"
  - id: "INS-063"
    kind: "insight"
    description: "The first justfile correction reapplied at the earlier identical recipe block and required scoped editing."
    fp: "d0debc747476"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:17:20.539Z"
  - id: "DL-329"
    kind: "difficulty"
    description: "The complete focused stable-route gate exceeded thirty seconds during its real Chromium scenario."
    fp: "25fff148cff5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:18:27.746Z"
  - id: "DL-330"
    kind: "difficulty"
    description: "Focused residual validation failed because the workspace-filtered CLI resolved documentation paths from the API package."
    fp: "a9b615b9ab47"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:18:27.800Z"
  - id: "WIN-021"
    kind: "win"
    description: "The complete focused stable-route gate passed after a greater-than-thirty-second Chromium proof and residual audit."
    fp: "22c851c279be"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:19:32.788Z"
  - id: "INS-064"
    kind: "insight"
    description: "A configured Git checkout hook referenced unavailable git-personas but explicitly skipped without blocking the edit."
    fp: "1ad7df33e157"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:20:13.369Z"
  - id: "DL-331"
    kind: "difficulty"
    description: "Full validation failed at the configured formatting gate for newly added TypeScript files."
    fp: "fbb6e380ab7e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:20:44.845Z"
  - id: "DL-332"
    kind: "difficulty"
    description: "Focused validation exposed an existing documentation contract that required preserving the exact lowercase stable route or proxy boundary phrase."
    fp: "523dafef1b0e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:21:25.941Z"
  - id: "DL-333"
    kind: "difficulty"
    description: "Full validation reached TypeScript and exposed readonly header-array and structured-event record type incompatibilities."
    fp: "bce3064955b1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:22:22.136Z"
  - id: "DL-334"
    kind: "difficulty"
    description: "Full package-level tests changed the working directory and revealed repository documentation tests that used unstable relative paths."
    fp: "1dfbc8249bb9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:23:52.005Z"
  - id: "DL-335"
    kind: "difficulty"
    description: "Full validation failed the global branch-coverage threshold after the new proxy and residual-audit branches reduced coverage to 78.52 percent."
    fp: "bbde2aa70080"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:25:12.088Z"
  - id: "DL-336"
    kind: "difficulty"
    description: "Expanded edge tests improved coverage but the full gate remained below threshold at 78.95 percent, requiring deeper transport branch execution."
    fp: "a3650fd652b5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:29:35.649Z"
  - id: "INS-065"
    kind: "insight"
    description: "The new HTTP fault matrix revealed that unknown projects are rejected by the route boundary with project_not_found before proxy resolution."
    fp: "1f74c5247824"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:30:59.882Z"
  - id: "DL-337"
    kind: "difficulty"
    description: "The executable HTTP fault matrix raised branch coverage to 79.97 percent, leaving the full gate one effective branch short."
    fp: "1a90ca7bc2ce"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:32:57.400Z"
  - id: "CONF-058"
    kind: "confusion"
    description: "A coverage-inspection helper had a missing JavaScript brace and required a corrected retry."
    fp: "4e291611b404"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:33:23.960Z"
  - id: "DL-338"
    kind: "difficulty"
    description: "A single additional runtime classification branch did not move the rounded global report above 79.97 percent, so another real socket fault was needed."
    fp: "1bc35ff71357"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:34:45.005Z"
  - id: "DL-339"
    kind: "difficulty"
    description: "Full validation passed coverage and later failed because the designated stable-route Chromium proof reached its thirty-second timeout during cleanup."
    fp: "f6693a4dcda5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:37:48.759Z"
  - id: "WIN-022"
    kind: "win"
    description: "The stable-route gate passed after the finite-bound Chromium proof ran for more than thirty seconds and the residual audit remained clean."
    fp: "85b400a6c432"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:39:16.396Z"
  - id: "WIN-023"
    kind: "win"
    description: "Authoritative full validation passed after long Chromium proofs, with branch coverage above threshold and a clean stable-route residual audit."
    fp: "76facb709a25"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:41:51.103Z"
  - id: "DL-340"
    kind: "difficulty"
    description: "A repeated full run hit the unrelated migration integration test finite ten-second timeout under transient host load after prior passes."
    fp: "59f78103f7d4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:43:48.526Z"
  - id: "WIN-024"
    kind: "win"
    description: "The full validation retry passed all gates after the transient migration timeout, including 80.01 percent API branch coverage and clean residual audit."
    fp: "1250e247c452"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:46:28.048Z"
  - id: "CONF-059"
    kind: "confusion"
    description: "The oversized observation-list capture could not be parsed from the tool spill file and was retained as raw evidence instead."
    fp: "986dd140a12f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:47:11.951Z"
  - id: "DL-341"
    kind: "difficulty"
    description: "The harness observation list itself truncated at 65536 bytes, so downstream jq received incomplete JSON."
    fp: "439cc89f760e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:47:41.597Z"
  - id: "DL-342"
    kind: "difficulty"
    description: "Acceptance evidence is distributed across large matrices, requiring manual cross-checking against exact finite case counts."
    fp: "96178fc1c8fd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:52:21.182Z"
  - id: "COORD-044"
    kind: "coordination"
    description: "The focused stable-route validation gate waited over 30 seconds for its designated Chromium scenario to finish."
    fp: "cddbd5c2df2e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:53:41.247Z"
  - id: "COORD-045"
    kind: "coordination"
    description: "The full repository verification gate waited over 30 seconds while running all configured validation stages."
    fp: "25e565e476d0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:56:22.715Z"
  - id: "DL-343"
    kind: "difficulty"
    description: "A validation-summary search assumed ripgrep was installed, but the executable was unavailable in the verifier environment."
    fp: "b71615834335"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:56:48.424Z"
  - id: "COORD-046"
    kind: "coordination"
    description: "The validation summary search had to be retried with grep after the preferred search executable was unavailable."
    fp: "252f7ebcb6e3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:57:01.926Z"
  - id: "DL-344"
    kind: "difficulty"
    description: "A restricted-evidence summary assumed Python was installed, but the executable was unavailable in the verifier environment."
    fp: "7eda3f7da5e5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:57:42.812Z"
  - id: "COORD-047"
    kind: "coordination"
    description: "The restricted-evidence summary had to be retried with Node after Python was unavailable."
    fp: "e23f441edeb6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:57:53.519Z"
  - id: "INS-066"
    kind: "insight"
    description: "Configured gates passed, but the restricted evidence contained only V-2 and V-7 matrices, so green validation was not conclusive for the acceptance contract."
    fp: "b8f120b3d4ec"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T02:59:04.549Z"
  - id: "CONF-060"
    kind: "confusion"
    description: "Two task-referenced core-component files were absent and required resolving the existing architecture set."
    fp: "7b16607b824d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:01:16.744Z"
  - id: "DL-345"
    kind: "difficulty"
    description: "The expected python command was unavailable, requiring a retry with the installed python3 executable."
    fp: "2a5a3d9395de"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:03:32.929Z"
  - id: "DL-346"
    kind: "difficulty"
    description: "A shell-quoted source edit failed to parse, requiring a safer file-edit invocation and retry."
    fp: "d6a03b150654"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:04:30.814Z"
  - id: "DL-347"
    kind: "difficulty"
    description: "Focused proxy validation failed because the logging assertion still expected a raw project identifier."
    fp: "6c0fce31af0e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:05:33.036Z"
  - id: "DL-348"
    kind: "difficulty"
    description: "Focused proof validation exposed project-token scan scope and pending-upgrade shutdown ordering defects."
    fp: "e1a8e87d1916"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:09:20.874Z"
  - id: "DL-349"
    kind: "difficulty"
    description: "The targeted shutdown proof still reset a pending upgrade before its required 503 response."
    fp: "33b23755ce31"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:10:29.944Z"
  - id: "DL-350"
    kind: "difficulty"
    description: "Focused WebSocket validation found refusal clients were not removed from the observed client inventory."
    fp: "f551bea91275"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:18:14.752Z"
  - id: "DL-351"
    kind: "difficulty"
    description: "A quoted WebSocket test edit failed to parse and required a marker-based retry."
    fp: "7137350257a5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:18:41.786Z"
  - id: "DL-352"
    kind: "difficulty"
    description: "A documentation contract edit hit shell quoting and required a safer full-file rewrite."
    fp: "f3645c9614ea"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:25:41.189Z"
  - id: "DL-353"
    kind: "difficulty"
    description: "Focused security validation found an encoded authority spanning streamed chunks was not rewritten."
    fp: "fbe5cbafe05d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:27:03.922Z"
  - id: "DL-354"
    kind: "difficulty"
    description: "Real Chromium captured two WebSocket connections per navigation instead of the planned one-per-navigation count."
    fp: "a88907aac0fe"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:29:40.000Z"
  - id: "DL-355"
    kind: "difficulty"
    description: "The browser count edit matched only one duplicated block and required separate event-summary updates."
    fp: "ae9be689fe33"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:30:53.831Z"
  - id: "CONF-061"
    kind: "confusion"
    description: "The expected code-server gallery environment configuration was absent from runtime and browser support."
    fp: "89531e0e6d9d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:34:01.035Z"
  - id: "CONF-062"
    kind: "confusion"
    description: "Code-server had no server-side webview endpoint override in its compiled Node output."
    fp: "472e3dec8379"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:34:52.978Z"
  - id: "DL-356"
    kind: "difficulty"
    description: "No smaller installed VS Code bundle exposed the webview endpoint configuration, complicating same-origin setup."
    fp: "945e4bc8566f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:36:59.273Z"
  - id: "DL-357"
    kind: "difficulty"
    description: "The diagnostic browser regex used an invalid Unicode identity escape and blocked Playwright collection."
    fp: "4f5adbe1f86e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:48:23.413Z"
  - id: "INS-067"
    kind: "insight"
    description: "Built-in code-server Markdown Preview requires isolated vscode-resource external-origin requests that the plan did not model."
    fp: "b8a7f51d56cd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T03:58:47.549Z"
  - id: "CONF-063"
    kind: "confusion"
    description: "The guessed BL-001 work-item path was absent and required issue-prefix resolution."
    fp: "5421fa6e2e56"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:00:12.942Z"
  - id: "CONF-064"
    kind: "confusion"
    description: "No BL-001 action plan exists in the current work-item tree, so source contracts govern the stability fix."
    fp: "316305d5ae24"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:00:37.980Z"
  - id: "DL-358"
    kind: "difficulty"
    description: "A shell-embedded Python edit failed on nested quote syntax and required a safer patch method."
    fp: "c636687976c5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:01:22.252Z"
  - id: "DL-359"
    kind: "difficulty"
    description: "Focused validation exposed a concurrent public-artifact deletion race in the expanded residual scan."
    fp: "1253e87ee010"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:02:35.221Z"
  - id: "CONF-065"
    kind: "confusion"
    description: "The expected code-server installation tree contained no searchable webview origin configuration."
    fp: "2375f8fe695a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:03:51.005Z"
  - id: "CONF-066"
    kind: "confusion"
    description: "The code-server executable was installed under the vscode home rather than the assumed system path."
    fp: "9b71ab63de4c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:04:20.073Z"
  - id: "DL-360"
    kind: "difficulty"
    description: "The repository environment lacked ripgrep, requiring bounded grep alternatives for minified code-server assets."
    fp: "1e08e2707490"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:04:59.599Z"
  - id: "DL-361"
    kind: "difficulty"
    description: "Real Chromium validation failed because Preview and gallery emitted inventoried external-origin requests."
    fp: "192c7401c100"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:07:12.775Z"
  - id: "DL-362"
    kind: "difficulty"
    description: "Real Chromium route validation took over thirty seconds while collecting the complete network inventory."
    fp: "0f2eb0d122dd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:07:12.826Z"
  - id: "CONF-067"
    kind: "confusion"
    description: "The restricted browser evidence path differed from the inferred work-item evidence location."
    fp: "df65871567b1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:08:29.452Z"
  - id: "DL-363"
    kind: "difficulty"
    description: "Focused validation caught an escaped-newline edit becoming an unterminated TypeScript string."
    fp: "71ce2b1e7ce4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:12:25.724Z"
  - id: "DL-364"
    kind: "difficulty"
    description: "A documentation edit was blocked because Markdown backticks inside shell quoting resembled command substitution."
    fp: "3156ea76a4cb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:13:25.659Z"
  - id: "CONF-068"
    kind: "confusion"
    description: "Real Chromium proof conflicts with the planned same-origin-only inventory because Markdown Preview uses a VS Code CDN origin and code-server contacted Open VSX."
    fp: "1c6255cc3918"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:17:01.297Z"
  - id: "DL-365"
    kind: "difficulty"
    description: "A Markdown regex ending in dollar before a code span triggered JavaScript replacement-string prefix expansion and required rebuilding the core-component."
    fp: "2bf17f59f332"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:25:19.315Z"
  - id: "COORD-048"
    kind: "coordination"
    description: "Parallel harness observation calls returned the same insight ID and only the sibling records remained in the session buffer."
    fp: "913b59b7628a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:27:38.401Z"
  - id: "DL-366"
    kind: "difficulty"
    description: "The python executable was unavailable while resolving the unique Issue 27 action plan, requiring a retry with python3."
    fp: "401c45cdc5c0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:28:46.150Z"
  - id: "DL-367"
    kind: "difficulty"
    description: "The ripgrep executable was unavailable while locating socket-role and origin classifications, requiring a retry with grep."
    fp: "8cbef6c7dadd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:31:17.654Z"
  - id: "DL-368"
    kind: "difficulty"
    description: "The first scripted proxy-manager edit hit shell quoting syntax and required a safer retry with uniformly quoted Python replacements."
    fp: "af07e4f9586d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:34:42.801Z"
  - id: "DL-369"
    kind: "difficulty"
    description: "The browser-classifier edit was rejected because a TypeScript template pattern resembled dangerous shell expansion, requiring a safer non-template implementation."
    fp: "4e7047ed5ab6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:35:48.952Z"
  - id: "DL-370"
    kind: "difficulty"
    description: "Focused T-7 validation failed because the source-contract assertion lost escaping around the empty EXTENSIONS_GALLERY object literal."
    fp: "cdce1a9fcf21"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:39:02.838Z"
  - id: "DL-371"
    kind: "difficulty"
    description: "Focused T-8 validation failed on two overly literal documentation expectations for six network sockets and the quoted gallery environment value."
    fp: "3600149e4452"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:42:38.181Z"
  - id: "DL-372"
    kind: "difficulty"
    description: "The real Chromium proof observed no network request at the trusted Markdown webview origin despite rendered Preview, requiring diagnosis of the webview evidence boundary."
    fp: "d7dfe31d84f1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:43:56.093Z"
  - id: "DL-373"
    kind: "difficulty"
    description: "The second Chromium run found neither a trusted network request nor trusted frame URL, so safe frame-shape diagnostics are needed before adjusting the evidence contract."
    fp: "5f1f1e9cb451"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:46:01.818Z"
  - id: "INS-068"
    kind: "insight"
    description: "Safe Chromium diagnostics revealed the actual Markdown webview host uses a plus sign in its opaque label, contradicting the Plan regex that permits only lowercase alphanumerics and hyphens."
    fp: "889b7c030b62"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:47:39.803Z"
  - id: "DL-374"
    kind: "difficulty"
    description: "The expected rg search tool was unavailable, requiring a grep fallback while locating retained VS Code webview evidence."
    fp: "35f5766a0df8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:49:36.452Z"
  - id: "CONF-069"
    kind: "confusion"
    description: "A parallel research read requested lines beyond the actual brief because the earlier truncated output implied a longer range."
    fp: "001494df1252"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:50:08.870Z"
  - id: "CONF-070"
    kind: "confusion"
    description: "The stable proxy core-component range read overshot because the viewer reported only 118 physical lines despite long wrapped content."
    fp: "26c3c91bea9c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:50:41.420Z"
  - id: "DL-375"
    kind: "difficulty"
    description: "A guessed Playwright support module path did not exist, requiring the actual e2e file inventory before further inspection."
    fp: "98427436b186"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:51:14.905Z"
  - id: "DL-376"
    kind: "difficulty"
    description: "A guessed unit-test path for the browser observation module did not exist, requiring source-file discovery before reading tests."
    fp: "b07c22aa525e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:51:15.041Z"
  - id: "DL-377"
    kind: "difficulty"
    description: "The python executable was unavailable for evidence parsing, requiring the installed python3 command as a fallback."
    fp: "9a0fb9a695ea"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:51:15.122Z"
  - id: "MW-001"
    kind: "magic-wand"
    description: "An initial acceptance-coverage check exited zero without asserting anything, requiring a real parser and explicit failures."
    fp: "d5e86b8a943d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:56:57.504Z"
  - id: "CONF-071"
    kind: "confusion"
    description: "The architecture validation failed without naming its assertion, requiring a diagnostic rerun before the final checkpoint."
    fp: "2680cf9db709"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T04:59:01.463Z"
  - id: "DL-378"
    kind: "difficulty"
    description: "Plan files exceeded the initial view limit and required range reads."
    fp: "16bfa64594a1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:01:39.753Z"
  - id: "DL-379"
    kind: "difficulty"
    description: "The expected ripgrep executable was unavailable, requiring a grep fallback."
    fp: "1a1c820eedf7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:02:26.478Z"
  - id: "CONF-072"
    kind: "confusion"
    description: "A requested file range exceeded the measured file length and required a corrected read."
    fp: "d504dcbf3ca9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:03:44.160Z"
  - id: "DL-380"
    kind: "difficulty"
    description: "The documented python command was unavailable during a source edit and required python3."
    fp: "ac88c854f2d4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:04:17.513Z"
  - id: "INS-069"
    kind: "insight"
    description: "Focused classifier validation failed because a supposed free hyphen formed a valid four-hex token."
    fp: "d412f8a35f65"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:05:38.104Z"
  - id: "INS-070"
    kind: "insight"
    description: "Focused validation showed a short escape followed by digits can still satisfy the exact token grammar."
    fp: "b47bcb52eb39"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:06:11.529Z"
  - id: "DL-381"
    kind: "difficulty"
    description: "A semicolon-scoped Python guard skipped a requested source edit and required a corrected edit."
    fp: "867b8e93e8db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:08:16.719Z"
  - id: "DL-382"
    kind: "difficulty"
    description: "A shell-sensitive backtick in a scripted edit was rejected and required a literal-free rewrite."
    fp: "66ac1d19ff28"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:09:19.234Z"
  - id: "SUGG-013"
    kind: "improvement-suggestion"
    description: "Focused evidence validation exposed that the published regex included an implementation-only capture group."
    fp: "545c3db83ad7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:09:57.091Z"
  - id: "DL-383"
    kind: "difficulty"
    description: "Markdown backticks in a multi-file scripted edit triggered shell rejection and required placeholder construction."
    fp: "ab58f888a230"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:11:02.748Z"
  - id: "DL-384"
    kind: "difficulty"
    description: "The designated browser proof classified seven observed resources as forbidden and required diagnosis."
    fp: "fde1dce5f82e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:13:55.398Z"
  - id: "DL-385"
    kind: "difficulty"
    description: "The designated Chromium route proof required more than thirty seconds to return."
    fp: "abe1c67382a6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:13:55.789Z"
  - id: "DL-386"
    kind: "difficulty"
    description: "The repeated browser proof failed during a streamed workbench asset before classification diagnosis completed."
    fp: "54d5f0bf9b19"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:15:28.285Z"
  - id: "DL-387"
    kind: "difficulty"
    description: "The repeated designated Chromium proof again exceeded thirty seconds before returning."
    fp: "e8e3d31a6eae"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:15:28.324Z"
  - id: "DL-388"
    kind: "difficulty"
    description: "Template interpolation in a regression-test edit triggered shell rejection and required concatenated literals."
    fp: "be44cac6de2e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:17:01.282Z"
  - id: "INS-071"
    kind: "insight"
    description: "Bounded diagnostics identified seven stable-origin browser-local script URLs outside network route rules."
    fp: "9200c36c973d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:18:43.789Z"
  - id: "DL-389"
    kind: "difficulty"
    description: "The corrected Chromium proof still required more than thirty seconds before returning."
    fp: "5ad06fc49b49"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:18:43.877Z"
  - id: "DL-390"
    kind: "difficulty"
    description: "Backticks in a Plan wording edit triggered shell rejection and required character-safe construction."
    fp: "057fc5bebf16"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:20:26.163Z"
  - id: "DL-391"
    kind: "difficulty"
    description: "The browser inventory proof again exceeded thirty seconds before returning cleanup results."
    fp: "3644a9d6ee3a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:22:01.303Z"
  - id: "INS-072"
    kind: "insight"
    description: "Context closure left browser-local request tracker entries pending despite browser resource shutdown."
    fp: "bf14c7d36122"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:22:01.765Z"
  - id: "INS-073"
    kind: "insight"
    description: "Observed context closure did not emit every browser WebSocket close event to the tracker."
    fp: "e508ca32ee91"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:23:21.019Z"
  - id: "DL-392"
    kind: "difficulty"
    description: "The fifth designated browser proof exceeded thirty seconds before socket cleanup returned."
    fp: "a1dd5fc46580"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:23:21.072Z"
  - id: "WIN-025"
    kind: "win"
    description: "The successful designated Chromium proof exceeded thirty seconds and completed with zero residual owners."
    fp: "64361a2c7ec2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:24:49.665Z"
  - id: "DL-393"
    kind: "difficulty"
    description: "Full validation failed because tracked changes and linked worktree contents required formatting isolation."
    fp: "003aa47b7f35"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:25:56.069Z"
  - id: "DL-394"
    kind: "difficulty"
    description: "Focused validation failed after formatting and required diagnosis from the retained test output."
    fp: "43a716aa6c0b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:26:47.421Z"
  - id: "DL-395"
    kind: "difficulty"
    description: "Full validation reached TypeScript and exposed an ArrayBuffer conversion overload mismatch."
    fp: "4a960f89dc0a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:28:11.035Z"
  - id: "WIN-026"
    kind: "win"
    description: "The successful full repository verification required more than thirty seconds to complete."
    fp: "233dea8c5114"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:32:07.265Z"
  - id: "CONF-073"
    kind: "confusion"
    description: "The retained full-validation output was shorter than estimated and required a corrected tail range."
    fp: "a7e623252467"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:32:41.609Z"
  - id: "INS-074"
    kind: "insight"
    description: "The checkout uses a nonlocal Git directory, so the assumed .git/info exclude path was unavailable."
    fp: "f56d4b239333"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:34:57.872Z"
  - id: "DL-396"
    kind: "difficulty"
    description: "The optional file utility and Git info directory were unavailable during worktree exclusion setup."
    fp: "238edcef1390"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:35:33.919Z"
  - id: "INS-075"
    kind: "insight"
    description: "The clean-worktree checkout reported an unavailable optional git-personas hook and continued safely."
    fp: "4de13eae5030"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:36:33.797Z"
  - id: "DL-397"
    kind: "difficulty"
    description: "Clean-worktree full validation used stale dependencies without direct ws ownership and required paved setup."
    fp: "f23151189d14"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:37:21.699Z"
  - id: "INS-076"
    kind: "insight"
    description: "Prepared clean-worktree validation exposed evidence tests that incorrectly depended on a prior generated file."
    fp: "76737173eb73"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:39:01.270Z"
  - id: "DL-398"
    kind: "difficulty"
    description: "Final primary verification exposed three load-sensitive timeout and early-exit classification races."
    fp: "98d3018ec8db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:41:10.470Z"
  - id: "DL-399"
    kind: "difficulty"
    description: "Full-suite load exceeded the default terminal command bound in a host-integration unit case."
    fp: "4db3e56a32ae"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T05:43:22.966Z"
  - id: "DL-400"
    kind: "difficulty"
    description: "Reading the action plan required a retry because long logical lines triggered file truncation."
    fp: "c9ce9fb272c9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:19:44.160Z"
  - id: "CONF-074"
    kind: "confusion"
    description: "Repository inspection expected ripgrep, but the environment did not provide the rg executable."
    fp: "cefe07776b0f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:20:32.496Z"
  - id: "DL-401"
    kind: "difficulty"
    description: "The designated Chromium gate failed because the integrated terminal disappeared before its digest check."
    fp: "ccfed91d3913"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:23:57.355Z"
  - id: "CONF-075"
    kind: "confusion"
    description: "A planned repository edit assumed a python executable, but only the project Node runtime is available."
    fp: "01583af7f834"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:25:07.813Z"
  - id: "DL-402"
    kind: "difficulty"
    description: "Full repository validation failed after the terminal-proof correction and requires bounded output diagnosis."
    fp: "9aeed5968358"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:28:31.786Z"
  - id: "DL-403"
    kind: "difficulty"
    description: "The terminal readiness edit missed because the replacement string used different quote formatting."
    fp: "ddf134fb8824"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:29:10.801Z"
  - id: "DL-404"
    kind: "difficulty"
    description: "Repeated baseline Chromium validation exposed another fixed five-second terminal completion wait under parallel load."
    fp: "657a5aeb3498"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:30:44.633Z"
  - id: "INS-077"
    kind: "insight"
    description: "Creating the clean worktree exposed an optional git-personas hook executable that is unavailable."
    fp: "df2c4ab13f5b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:38:19.274Z"
  - id: "DL-405"
    kind: "difficulty"
    description: "Clean-worktree setup and full validation failed at the final committed revision and requires diagnosis."
    fp: "28158925dd86"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:39:58.933Z"
  - id: "INS-078"
    kind: "insight"
    description: "The clean-worktree setup and full validation command required more than thirty seconds to complete."
    fp: "2f823696f090"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:40:08.806Z"
  - id: "INS-079"
    kind: "insight"
    description: "The corrected baseline Chromium and capacity audit run required more than thirty seconds to complete."
    fp: "b01843dff295"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:41:52.965Z"
  - id: "DL-406"
    kind: "difficulty"
    description: "Clean-worktree validation at the cancellation-bound revision still failed and requires another root-cause check."
    fp: "c0023a40152e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:44:09.617Z"
  - id: "INS-080"
    kind: "insight"
    description: "The extended cancellation-window baseline run required more than thirty seconds to complete."
    fp: "e8d03916851a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:46:04.593Z"
  - id: "DL-407"
    kind: "difficulty"
    description: "Clean-worktree validation with the extended cancellation window failed again and needs exact failure inspection."
    fp: "f61f4058b664"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:48:17.292Z"
  - id: "DL-408"
    kind: "difficulty"
    description: "The automated worktree-path edit inserted escaped newline text and missed one route command."
    fp: "648067bab716"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:49:25.552Z"
  - id: "INS-081"
    kind: "insight"
    description: "The worktree-resolved baseline terminal proof run required more than thirty seconds to complete."
    fp: "fe520a141aea"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:51:27.485Z"
  - id: "INS-082"
    kind: "insight"
    description: "The worktree-resolved designated Chromium route gate required more than thirty seconds to complete."
    fp: "8e956fc80365"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:52:31.685Z"
  - id: "DL-409"
    kind: "difficulty"
    description: "Clean-worktree verification reached the final proof paths but failed repository formatting on those edits."
    fp: "ef7f2f4c1c8c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:53:23.831Z"
  - id: "DL-410"
    kind: "difficulty"
    description: "Focused formatting validation still rejected the manually wrapped worktree proof command expressions."
    fp: "0f24517a4c1b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:54:03.238Z"
  - id: "DL-411"
    kind: "difficulty"
    description: "Clean-worktree validation passed formatting but failed later at the formatted proof-path revision."
    fp: "de111b47348a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:56:29.942Z"
  - id: "DL-412"
    kind: "difficulty"
    description: "Clean-worktree validation with correct paths and a 40-second window still failed at a later boundary."
    fp: "69973ed50c54"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T06:59:00.728Z"
  - id: "DL-413"
    kind: "difficulty"
    description: "Clean-worktree full validation exposed a readiness-timeout process cleanup race under concurrent coverage load."
    fp: "84e5c2d1ef23"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:01:32.074Z"
  - id: "DL-414"
    kind: "difficulty"
    description: "Clean-worktree cancellation reached timeout without tracking a terminal command under full-suite load."
    fp: "16331cd68ee5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:06:26.412Z"
  - id: "DL-415"
    kind: "difficulty"
    description: "A shell-quoted scripted edit failed because embedded single quotes broke the literal command."
    fp: "6b0d43dee156"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:11:56.992Z"
  - id: "INS-083"
    kind: "insight"
    description: "Clean-worktree terminal textbox attached before the integrated shell accepted its proof command under load."
    fp: "5fc909b255c4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:17:24.028Z"
  - id: "INS-084"
    kind: "insight"
    description: "Clean setup installs tsx in the API workspace rather than the repository-root bin used by terminal proofs."
    fp: "183d7f2fa426"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:29:20.255Z"
  - id: "DL-416"
    kind: "difficulty"
    description: "The diagnostic clean-worktree copy blocked checkout until its tracked file was restored."
    fp: "9db6d24bab72"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:43:25.722Z"
  - id: "SUGG-014"
    kind: "improvement-suggestion"
    description: "The root justfile exposed format-check but no formatting-write recipe for implementation edits."
    fp: "0314779cf6f4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:52:07.735Z"
  - id: "DL-417"
    kind: "difficulty"
    description: "The action plan exceeded the file viewer limit and required a ranged reread."
    fp: "876ef51cc332"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:54:26.725Z"
  - id: "DL-418"
    kind: "difficulty"
    description: "The designated Chromium route proof required a tool wait longer than 30 seconds."
    fp: "bc1b0dd5fdd7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:56:47.435Z"
  - id: "INS-085"
    kind: "insight"
    description: "Shared code-server terminal state retained the primary checkout cwd despite a clean runtime process cwd."
    fp: "47039b057626"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:57:24.055Z"
  - id: "DL-419"
    kind: "difficulty"
    description: "The full repository verification required a tool wait longer than 30 seconds."
    fp: "879672fea237"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T07:59:56.539Z"
  - id: "COORD-049"
    kind: "coordination"
    description: "Another process advanced the implementation branch during validation from 1653f18 to d75cd4e."
    fp: "4785f79dca8c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:00:32.734Z"
  - id: "COORD-050"
    kind: "coordination"
    description: "Validation had to be repeated because the branch changed while the full gate was running."
    fp: "159766b9982f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:01:01.127Z"
  - id: "DL-420"
    kind: "difficulty"
    description: "Primary full validation encountered a transient retained-handle check after clean-worktree browser validation."
    fp: "00e853979381"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:05:27.932Z"
  - id: "DL-421"
    kind: "difficulty"
    description: "The implementation-note edit was blocked because Markdown backticks were parsed as shell expansion."
    fp: "9c0fe9b89ab0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:05:50.583Z"
  - id: "CONF-076"
    kind: "confusion"
    description: "The documented Python edit path was unavailable because this repository image has no python executable."
    fp: "bc83bc2f0527"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:06:15.710Z"
  - id: "CONF-077"
    kind: "confusion"
    description: "Implementation notes changed concurrently during terminal parity and introduced premature validation claims."
    fp: "2570cc14e087"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:07:34.315Z"
  - id: "COORD-051"
    kind: "coordination"
    description: "Another process reverted the implementation-note update while final verification was running."
    fp: "48d85f1815a2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:10:06.177Z"
  - id: "CONF-078"
    kind: "confusion"
    description: "The observation-list grep unexpectedly returned no records for IDs captured in this session."
    fp: "b085ebea43ec"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:10:45.982Z"
  - id: "DL-422"
    kind: "difficulty"
    description: "The observation list exceeded its output bound and could not be parsed as complete JSON."
    fp: "d3117424c5db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:11:31.614Z"
  - id: "DL-423"
    kind: "difficulty"
    description: "The documented Python probe was unavailable because this repository environment exposes no python command."
    fp: "dc62fee185e7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:13:41.209Z"
  - id: "DL-424"
    kind: "difficulty"
    description: "The combined documentation diff exceeded the tool output limit and required reading the saved output in multiple ranges."
    fp: "dd4f71db37c9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:16:33.277Z"
  - id: "CONF-079"
    kind: "confusion"
    description: "An exact orphan process-group cleanup attempt returned no diagnostic output on failure."
    fp: "e60f675ed1bf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:16:34.713Z"
  - id: "SUGG-015"
    kind: "improvement-suggestion"
    description: "The broad documentation inventory unexpectedly traversed linked worktrees and agent skill trees, producing oversized duplicate results."
    fp: "c7ae5408cebf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:16:50.991Z"
  - id: "DL-425"
    kind: "difficulty"
    description: "Repository search required fallback because ripgrep is unavailable."
    fp: "c2bf2d336958"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:20:19.467Z"
  - id: "INS-086"
    kind: "insight"
    description: "Piped repository searches masked missing ripgrep with a zero exit status."
    fp: "39b888b89b2f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:20:28.023Z"
  - id: "DL-426"
    kind: "difficulty"
    description: "Repository edit tooling required python3 because the python executable is unavailable."
    fp: "b3d6f4677ecd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:23:52.395Z"
  - id: "DL-427"
    kind: "difficulty"
    description: "The repository environment did not provide rg, so diff inspection had to fall back to grep."
    fp: "2dfb122799c6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:26:22.798Z"
  - id: "COORD-052"
    kind: "coordination"
    description: "The working tree became dirty during verification without verifier edits, blocking exact commit validation."
    fp: "1c9709c89a4d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:27:15.722Z"
  - id: "DL-428"
    kind: "difficulty"
    description: "Focused failure and security validation failed and required diagnosis."
    fp: "2fa60f4a01ef"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:29:47.080Z"
  - id: "DL-429"
    kind: "difficulty"
    description: "The action plan exceeded the file viewer limit and required a ranged read."
    fp: "876ef51cc332"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:30:11.408Z"
  - id: "INS-087"
    kind: "insight"
    description: "Focused validation retry exposed missing HTTP completion events and an allowed token scan."
    fp: "9a387c9cd7b9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:30:31.141Z"
  - id: "DL-430"
    kind: "difficulty"
    description: "Focused validation retry exposed a fake-upstream socket cleanup leak."
    fp: "ea016670c304"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:31:27.695Z"
  - id: "DL-431"
    kind: "difficulty"
    description: "Focused validation left one failure-matrix socket open and required diagnosis."
    fp: "995116032e67"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:31:31.975Z"
  - id: "INS-088"
    kind: "insight"
    description: "Bounded cleanup retry confirmed one upstream connection remains open."
    fp: "146dbd568c4f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:32:10.044Z"
  - id: "CONF-080"
    kind: "confusion"
    description: "The expected python executable was unavailable; repository edits require python3."
    fp: "407e35069704"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:32:15.326Z"
  - id: "COORD-053"
    kind: "coordination"
    description: "Concurrent BL-011 edits changed the socket cleanup hunk during diagnosis and required rereading it."
    fp: "eed54907def3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:32:42.901Z"
  - id: "DL-432"
    kind: "difficulty"
    description: "Focused documentation validation failed on inconsistent framing terminology."
    fp: "05ef1551daf1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:34:30.629Z"
  - id: "DL-433"
    kind: "difficulty"
    description: "Full validation failed on acceptance-test formatting and required correction."
    fp: "4b7f711d2225"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:37:13.523Z"
  - id: "INS-089"
    kind: "insight"
    description: "Full validation retry showed formatter configuration was not applied by the edit helper."
    fp: "79627061ca2e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:38:42.311Z"
  - id: "DL-434"
    kind: "difficulty"
    description: "Full validation exposed a narrowed evidence-array type error and stale imports."
    fp: "6ee5ea3f4bcf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:39:18.243Z"
  - id: "DL-435"
    kind: "difficulty"
    description: "Full concurrent test load exposed a downstream failure-client close race."
    fp: "6205c49781f1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:40:13.451Z"
  - id: "DL-436"
    kind: "difficulty"
    description: "Full validation failed late in the suite and required log diagnosis."
    fp: "48c1e4625d3f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:43:37.316Z"
  - id: "CONF-081"
    kind: "confusion"
    description: "An exact browser-evidence function search unexpectedly returned no matches."
    fp: "9787351798a4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:44:23.203Z"
  - id: "DL-437"
    kind: "difficulty"
    description: "Complete focused validation exposed a stale redaction fixture missing the strengthened bounded fields."
    fp: "1cfe282fc3f5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:46:29.562Z"
  - id: "DL-438"
    kind: "difficulty"
    description: "Focused security guard validation failed because the positive fixture was incomplete."
    fp: "8ed3f2f858a6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:46:51.506Z"
  - id: "DL-439"
    kind: "difficulty"
    description: "Final full validation failed after security-test consolidation and required diagnosis."
    fp: "a2745896bc9f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:50:29.517Z"
  - id: "DL-440"
    kind: "difficulty"
    description: "Full validation hit a baseline terminal-parity overall timeout and required bounded rerun diagnosis."
    fp: "5cc2c14a8200"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:50:48.576Z"
  - id: "DL-441"
    kind: "difficulty"
    description: "Full validation found formatting drift after removing the legacy security helper."
    fp: "15120edec3ab"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:52:23.498Z"
  - id: "DL-442"
    kind: "difficulty"
    description: "Full validation failed again late after all static gates passed."
    fp: "1afc9e253886"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:54:29.304Z"
  - id: "DL-443"
    kind: "difficulty"
    description: "A documentation edit was blocked because Markdown backticks crossed the shell quoting boundary."
    fp: "b173e109853e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T08:56:57.559Z"
  - id: "DL-444"
    kind: "difficulty"
    description: "Post-evidence full verification failed late and required another diagnosis."
    fp: "e3f2ad037a08"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:00:44.341Z"
  - id: "DL-445"
    kind: "difficulty"
    description: "Final full validation found a live prior BL-001 handle after the preceding baseline run."
    fp: "804e94d8dcec"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:04:30.251Z"
  - id: "DL-446"
    kind: "difficulty"
    description: "Initial parallel artifact reads exceeded the view size limit, requiring ranged retries for three Plan artifacts."
    fp: "6cdf738adc89"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:08:11.578Z"
  - id: "DL-447"
    kind: "difficulty"
    description: "Grouped git diff output exceeded the tool display limit, requiring ranged inspection of two saved complete diff outputs."
    fp: "af918bbe828a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:09:33.092Z"
  - id: "DL-448"
    kind: "difficulty"
    description: "The expected rg search executable was unavailable while indexing saved diff sections, so portable grep is required."
    fp: "643de3d72125"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:09:52.351Z"
  - id: "DL-449"
    kind: "difficulty"
    description: "Documentation inventory traversed linked worktrees and exceeded output bounds, requiring a scope-corrected inventory and ranged document reads."
    fp: "9dd14f9ac9e3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:10:41.567Z"
  - id: "DL-450"
    kind: "difficulty"
    description: "Focused stable-route validation required more than 30 seconds while completing real Chromium and residual audit successfully."
    fp: "5374330923a3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:11:52.867Z"
  - id: "COORD-054"
    kind: "coordination"
    description: "Clean linked-worktree setup and full validation required a tool wait over 30 seconds."
    fp: "faa8a82103a6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:15:36.594Z"
  - id: "DL-451"
    kind: "difficulty"
    description: "Full verification output exceeded the display limit, requiring ranged inspection of the saved command output."
    fp: "0bbe99337c90"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:15:48.581Z"
  - id: "DL-452"
    kind: "difficulty"
    description: "Full repository verification required more than 30 seconds while completing all configured validation stages successfully."
    fp: "22491381fdbe"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:15:48.605Z"
  - id: "INS-090"
    kind: "insight"
    description: "Acceptance cleanup evidence is internally contradictory: securityFixtureSocketCount is one while the residual gate reports zero pending inventories."
    fp: "ee3668355982"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:16:33.728Z"
  - id: "COORD-055"
    kind: "coordination"
    description: "The checked-out branch HEAD changed concurrently from the handed-off SHA to a new commit during verification despite a clean tree."
    fp: "e97e54e6689d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:16:55.812Z"
  - id: "DL-453"
    kind: "difficulty"
    description: "Listing the shared observation catalog exceeded output bounds, so verification uses the known successful capture IDs directly."
    fp: "60b0c6912e06"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:17:39.083Z"
  - id: "DL-454"
    kind: "difficulty"
    description: "Reading all three Plan artifacts via parallel full-file views hit the 20 KB tool limit and required bounded range reads."
    fp: "28716e0ac4c4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:17:53.496Z"
  - id: "DL-455"
    kind: "difficulty"
    description: "The repository environment lacks rg, so three planned source-inspection searches failed and must be retried with grep."
    fp: "5b46f47240ac"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:19:24.563Z"
  - id: "DL-456"
    kind: "difficulty"
    description: "The repository environment lacks the expected rg search executable, requiring grep-based inspection."
    fp: "6547abd02605"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:20:11.232Z"
  - id: "DL-457"
    kind: "difficulty"
    description: "The combined application-documentation diff exceeded the tool output limit and required direct bounded reads of the remaining files."
    fp: "3bf2fd84124d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:20:21.360Z"
  - id: "INS-091"
    kind: "insight"
    description: "Socket cleanup behavior initially had to be inferred from evidence-capture ordering before targeted execution."
    fp: "d714a92a33ea"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:21:57.298Z"
  - id: "DL-458"
    kind: "difficulty"
    description: "The environment exposes python3 but not the expected python command used for repository edits."
    fp: "740fa80dabab"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:22:32.366Z"
  - id: "COORD-056"
    kind: "coordination"
    description: "The failed source edit must be retried with the available python3 executable."
    fp: "6a91722cd7a3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:22:41.139Z"
  - id: "DL-459"
    kind: "difficulty"
    description: "Independent just verify failed after the previously clean checkout changed during execution, including a parse error in the route acceptance suite."
    fp: "507d6752f55c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:23:44.249Z"
  - id: "DL-460"
    kind: "difficulty"
    description: "The security-test edit failed because nested shell quoting broke the Python replacement script and required a safer retry."
    fp: "5a3b8b24fd44"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:23:58.483Z"
  - id: "COORD-057"
    kind: "coordination"
    description: "The failed security-test edit must be retried with quote-safe indexed replacements."
    fp: "3cdd70f1851a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:24:13.569Z"
  - id: "COORD-058"
    kind: "coordination"
    description: "A concurrent writer modified three application or test files after the clean handoff check, invalidating exact-commit validation and leaving the shared checkout dirty."
    fp: "9e1389219814"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:24:28.701Z"
  - id: "DL-461"
    kind: "difficulty"
    description: "The residual-test edit could not match a quote-sensitive fixture block and required indexed replacement."
    fp: "5fea9fbe76b9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:25:58.378Z"
  - id: "COORD-059"
    kind: "coordination"
    description: "The failed residual-test edit must be retried with structure-based replacement boundaries."
    fp: "b28606786ecc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:26:06.354Z"
  - id: "DL-462"
    kind: "difficulty"
    description: "A second nested-quote shell failure blocked the residual negative-fixture edit before execution."
    fp: "67fbd408c0e2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:26:49.467Z"
  - id: "COORD-060"
    kind: "coordination"
    description: "The residual negative-fixture edit must be retried without literal apostrophes in the shell script."
    fp: "a1423d730c9e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:26:57.442Z"
  - id: "DL-463"
    kind: "difficulty"
    description: "The action plan exceeded the file viewer limit and required a ranged reread before context loading could continue."
    fp: "876ef51cc332"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:26:59.868Z"
  - id: "DL-464"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis of source-edit parse errors."
    fp: "68309f6874c6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:27:37.906Z"
  - id: "DL-465"
    kind: "difficulty"
    description: "The expected python executable was unavailable while inspecting exact source bytes, requiring a Node-based retry."
    fp: "7966af001737"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:28:41.424Z"
  - id: "COORD-061"
    kind: "coordination"
    description: "A concurrent writer changed the acceptance test between diff inspection and focused execution, making the initial hunk snapshot stale."
    fp: "37c18568bd86"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:29:02.665Z"
  - id: "DL-466"
    kind: "difficulty"
    description: "The expected ripgrep executable was unavailable while locating header coverage, requiring a grep-based retry."
    fp: "b1958d108d9e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:29:53.029Z"
  - id: "COORD-062"
    kind: "coordination"
    description: "Designated stable-route validation required a tool wait longer than thirty seconds for Chromium completion."
    fp: "15249e2b068e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:30:18.630Z"
  - id: "DL-467"
    kind: "difficulty"
    description: "Full validation failed and required diagnosis of repository formatting failures."
    fp: "4bfa049b94ed"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:30:57.950Z"
  - id: "DL-468"
    kind: "difficulty"
    description: "Manual formatting corrections were incomplete and required another focused formatting pass."
    fp: "bbe35028450c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:31:55.478Z"
  - id: "DL-469"
    kind: "difficulty"
    description: "The expected apply_patch helper was unavailable for source edits, requiring direct Node file transformation instead."
    fp: "20cf63e2a2c4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:32:45.298Z"
  - id: "DL-470"
    kind: "difficulty"
    description: "Full validation failed because the residual negative regression exceeded the default test timeout under suite load."
    fp: "4bda13c4970e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:33:18.481Z"
  - id: "COORD-063"
    kind: "coordination"
    description: "Concurrent tracked-file edits appeared during validation despite an unchanged HEAD and require integration before rerunning."
    fp: "396985d8b967"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:34:08.190Z"
  - id: "DL-471"
    kind: "difficulty"
    description: "Focused route-header validation failed because Node generated a replacement Keep-Alive response header after stripping the injected value."
    fp: "8954a24cf5da"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:34:59.239Z"
  - id: "COORD-064"
    kind: "coordination"
    description: "Concurrent-change monitoring required a tool wait longer than thirty seconds before integration could resume."
    fp: "e54b78393549"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:36:00.781Z"
  - id: "DL-472"
    kind: "difficulty"
    description: "Repository formatting validation failed on the new route-header matrix and required a style-only correction."
    fp: "eb46f2b9b143"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:36:02.493Z"
  - id: "INS-092"
    kind: "insight"
    description: "A repository Git hook referenced unavailable git-personas tooling and skipped during restore."
    fp: "53e6e5084505"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:36:34.805Z"
  - id: "DL-473"
    kind: "difficulty"
    description: "A style-only source replacement missed its expected anchor, requiring a fresh source read before retrying the edit."
    fp: "ff275e3fd5cd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:36:37.967Z"
  - id: "COORD-065"
    kind: "coordination"
    description: "The concurrent correction writer overwrote the newly added route-header test and helper evidence changes during formatting work."
    fp: "18fb29f6a8f2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:37:10.882Z"
  - id: "DL-474"
    kind: "difficulty"
    description: "The identified concurrent writer did not stop within two seconds of SIGTERM and required a bounded follow-up wait."
    fp: "581ce8e11829"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:38:05.937Z"
  - id: "INS-093"
    kind: "insight"
    description: "The designated Chromium route gate required more than thirty seconds while all three workflows and cleanup completed."
    fp: "15c299dbfa0e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:42:29.210Z"
  - id: "INS-094"
    kind: "insight"
    description: "The complete primary verification gate required more than thirty seconds while awaiting all browser and residual checks."
    fp: "e1319fe42a47"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:46:40.929Z"
  - id: "INS-095"
    kind: "insight"
    description: "Creating the isolated worktree exposed an optional missing git-personas hook dependency, but the hook explicitly skipped without affecting checkout."
    fp: "f50588ce632b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:48:32.949Z"
  - id: "INS-096"
    kind: "insight"
    description: "The isolated-worktree full verification required more than thirty seconds and completed with an unchanged tracked-file hash."
    fp: "b4258503370a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:51:50.741Z"
  - id: "INS-097"
    kind: "insight"
    description: "The final committed full verification required more than thirty seconds and left the tracked tree hash unchanged."
    fp: "40ffbe4ba36f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T09:55:17.663Z"
  - id: "DL-475"
    kind: "difficulty"
    description: "BL-012 pre-flight harness checks timed out at 120s while the expanded just verify suite was still progressing"
    fp: "8291088e6704"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T10:47:01.233Z"
  - id: "DL-476"
    kind: "difficulty"
    description: "Pre-flight harness boot failed after the checks extension hardcoded 120000 ms timeout was exceeded by expanded just verify, while direct just verify subsequently exited 0; this is a deterministic harness prerequisite gap rather than a product failure."
    fp: "faadd7531ade"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T10:50:48.810Z"
  - id: "INS-098"
    kind: "insight"
    description: "Repository search for react-router, @remix-run/router, and history usage returned no matches, confirming that the web package currently has no dedicated client-routing dependency or existing history integration."
    fp: "62c4d07733bc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T10:52:52.332Z"
  - id: "INS-099"
    kind: "insight"
    description: "Editor-file and terminal-marker continuity across Home visits is not exercised by current connected browser coverage; treating it as existing behavior would be inferred only from code-server process reuse."
    fp: "ef8024fb0141"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T10:54:12.338Z"
  - id: "DL-477"
    kind: "difficulty"
    description: "Research brief creation failed because the expected python executable is unavailable in this repository environment, requiring a backtrack to the available Node.js runtime."
    fp: "369afdde7117"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T10:56:40.180Z"
  - id: "DL-478"
    kind: "difficulty"
    description: "Filtering the oversized harness observation listing for this run returned unexpectedly empty output, so capture evidence must rely on the successful per-observation JSON envelopes already recorded."
    fp: "dea857bd7fc2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T10:58:38.872Z"
  - id: "DL-479"
    kind: "difficulty"
    description: "Repository search command failed because the expected rg executable is unavailable, requiring grep or git grep fallback."
    fp: "748a139e83ad"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:00:57.295Z"
  - id: "INS-100"
    kind: "insight"
    description: "Routing dependency search returned no client router or History API owner, so planning must not assume an existing abstraction."
    fp: "0985181579d4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:04:44.485Z"
  - id: "INS-101"
    kind: "insight"
    description: "Planning backtracked from direct proxy error decoration because BL-011 requires exact JSON failures while Issue 29 requires accessible top-level error documents."
    fp: "9fbda1d089e4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:04:53.708Z"
  - id: "INS-102"
    kind: "insight"
    description: "Editor-file and terminal-marker continuity would be inferred from runtime reuse without a connected browser observation, so the plan requires executable proof."
    fp: "356b14c6a57c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:05:06.094Z"
  - id: "DL-480"
    kind: "difficulty"
    description: "Core-component update failed because the exact failure-rule anchor differed from the inspected rendering, requiring a bounded source-line retry."
    fp: "38cd7a16c189"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:06:23.122Z"
  - id: "DL-481"
    kind: "difficulty"
    description: "Plan coverage validation failed because the AC regular expression matched one-digit prefixes before two-digit IDs, requiring an exact-boundary retry."
    fp: "89dfb0912701"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:11:31.366Z"
  - id: "DL-482"
    kind: "difficulty"
    description: "Architecture validation used an overly strict related-ADR adjacency assertion after valid formatting, requiring direct tail inspection and a corrected check."
    fp: "5099ef7a5149"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:12:13.397Z"
  - id: "INS-103"
    kind: "insight"
    description: "The implementation branch began with uncommitted Plan and architecture artifacts."
    fp: "5017d8bb2caa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:15:13.803Z"
  - id: "DL-483"
    kind: "difficulty"
    description: "Writing the harness extension was blocked by shell security and required a safer retry."
    fp: "69f9044cbd3e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:16:32.333Z"
  - id: "CONF-082"
    kind: "confusion"
    description: "The documented Python command was unavailable and the edit required the installed python3 binary."
    fp: "9acff4448cae"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:17:37.111Z"
  - id: "DL-484"
    kind: "difficulty"
    description: "Focused validation failed because the harness runtime contract package is unavailable to Vitest imports."
    fp: "03e34e027985"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:18:57.377Z"
  - id: "DL-485"
    kind: "difficulty"
    description: "Focused route and Home validation failed and required diagnosis from the retained test output."
    fp: "1b1d971ce74e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:25:06.003Z"
  - id: "DL-486"
    kind: "difficulty"
    description: "Direct Node inspection could not resolve TypeScript source imports and required a test-runner diagnostic."
    fp: "104a7df0ace2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:26:50.991Z"
  - id: "INS-104"
    kind: "insight"
    description: "Focused route validation exposed Fastify bad-URL interception before the workbench shell route."
    fp: "a163f7a15973"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:28:24.297Z"
  - id: "DL-487"
    kind: "difficulty"
    description: "Focused browser-shell validation failed because the jsdom harness erased the document before script execution."
    fp: "b842bab4ce84"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:30:40.635Z"
  - id: "DL-488"
    kind: "difficulty"
    description: "Focused matrix validation failed because the residual audit entrypoint import was missing."
    fp: "2f9110686564"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:39:15.032Z"
  - id: "DL-489"
    kind: "difficulty"
    description: "The designated Chromium gate waited over thirty seconds while workbench initialization stalled."
    fp: "29a9db4441f0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:40:55.515Z"
  - id: "DL-490"
    kind: "difficulty"
    description: "The designated main browser scenario failed before Monaco became visible and required diagnosis."
    fp: "4efd53790d46"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:40:55.759Z"
  - id: "DL-491"
    kind: "difficulty"
    description: "Focused proxy regression tests failed during application construction after front-door integration."
    fp: "679d3fa35580"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:42:53.535Z"
  - id: "CONF-083"
    kind: "confusion"
    description: "The expected installed code-server workbench configuration search returned no matches."
    fp: "078b952cee24"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:47:59.914Z"
  - id: "COORD-066"
    kind: "coordination"
    description: "Resuming an interrupted implementation required preserving substantial valid uncommitted changes."
    fp: "865c03a6701c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:51:14.948Z"
  - id: "DL-492"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis."
    fp: "7c0755e2cf6b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:53:06.199Z"
  - id: "CONF-084"
    kind: "confusion"
    description: "A grep pattern beginning with dashes required correcting the command invocation."
    fp: "247eb311c162"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:53:54.456Z"
  - id: "CONF-085"
    kind: "confusion"
    description: "The code-server distribution search unexpectedly returned no workspace URL handling matches."
    fp: "194c6d4f80bd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:55:16.711Z"
  - id: "INS-105"
    kind: "insight"
    description: "The code-server installation path required resolving its versioned symlink target before searching."
    fp: "acdb32752a59"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:55:32.754Z"
  - id: "DL-493"
    kind: "difficulty"
    description: "The expected ripgrep helper was unavailable, requiring a portable search fallback."
    fp: "1145475f6a71"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:55:59.713Z"
  - id: "DL-494"
    kind: "difficulty"
    description: "The expected Python helper was unavailable, requiring a Node-based search fallback."
    fp: "e7907f7912df"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T11:56:27.734Z"
  - id: "DL-495"
    kind: "difficulty"
    description: "Shell quoting while patching a regular expression required a safer literal replacement."
    fp: "bb4a4f075423"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:01:50.713Z"
  - id: "DL-496"
    kind: "difficulty"
    description: "The designated Chromium Home/workbench gate required more than 30 seconds to return."
    fp: "2be2a83f467c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:09:34.836Z"
  - id: "INS-106"
    kind: "insight"
    description: "The continuity proof required refocusing the existing terminal before asserting retained output."
    fp: "85fc39c1bffa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:19:54.335Z"
  - id: "INS-107"
    kind: "insight"
    description: "A root-path same-origin socket required separate development-front-door classification from workbench transport."
    fp: "f8815f9088b1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:33:36.139Z"
  - id: "DL-497"
    kind: "difficulty"
    description: "Browser validation exposed an unclassified stable-prefix WebSocket role requiring protocol-level diagnosis."
    fp: "e98270e55e7b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:35:25.549Z"
  - id: "DL-498"
    kind: "difficulty"
    description: "The expected apply_patch helper was unavailable, requiring a Node-based file edit fallback."
    fp: "9031f0c0eb43"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:38:49.787Z"
  - id: "DL-499"
    kind: "difficulty"
    description: "The expected Python helper was unavailable, requiring a Node-based search fallback."
    fp: "e7907f7912df"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:38:50.207Z"
  - id: "INS-108"
    kind: "insight"
    description: "Repeated browser validation required distinguishing a pre-control socket cancellation from a protocol role."
    fp: "a758989eb71c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:41:06.175Z"
  - id: "DL-500"
    kind: "difficulty"
    description: "Markdown backticks broke a Node template edit, requiring a safely quoted documentation retry."
    fp: "50f2ddb93cf1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:52:18.193Z"
  - id: "DL-501"
    kind: "difficulty"
    description: "Focused validation failed after documentation updates and required targeted output diagnosis."
    fp: "9ae43e9cf4b2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:54:38.503Z"
  - id: "DL-502"
    kind: "difficulty"
    description: "A second focused documentation contract exposed another stale route-documentation token."
    fp: "106a44f1f6f4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:56:05.930Z"
  - id: "DL-503"
    kind: "difficulty"
    description: "Harness boot reached canonical verification and exposed repository formatting failures in the issue changes."
    fp: "a67861262a2a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:57:57.399Z"
  - id: "DL-504"
    kind: "difficulty"
    description: "Harness boot formatting retry exposed two additional issue files omitted from the first formatter pass."
    fp: "e8c6a602c345"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T12:59:30.403Z"
  - id: "DL-505"
    kind: "difficulty"
    description: "Full harness checks exposed a web-to-API source import boundary and one uninitialized navigation ref during typecheck."
    fp: "5e5bade7473e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:00:48.916Z"
  - id: "DL-506"
    kind: "difficulty"
    description: "Moving the shell browser test to the API package broke its web testing-library resolution, requiring boundary-safe rollback."
    fp: "ee14e25a121e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:02:09.145Z"
  - id: "DL-507"
    kind: "difficulty"
    description: "API typecheck required an explicit DOM library reference for the server-serialized browser shell function."
    fp: "3d355686e8d3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:03:17.592Z"
  - id: "DL-508"
    kind: "difficulty"
    description: "Full harness verification exceeded thirty seconds before an existing Project Home fixture-integrity assertion failed."
    fp: "4b9db1f9e5c4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:06:21.531Z"
  - id: "DL-509"
    kind: "difficulty"
    description: "Harness boot killed the now-longer successful checks command at its separate 150-second readiness ceiling."
    fp: "16441a004b86"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:12:07.918Z"
  - id: "WIN-027"
    kind: "win"
    description: "Harness boot completed canonical checks in 223705 ms under the new composed finite budget."
    fp: "1d8dc3e050c7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:18:21.051Z"
  - id: "DL-510"
    kind: "difficulty"
    description: "Authoritative just verify failed late in the BL-012 browser gate and required evidence-tail diagnosis."
    fp: "d2d0ea5727fc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:19:34.336Z"
  - id: "DL-511"
    kind: "difficulty"
    description: "Focused validation caught that the new terminal cleanup constant was referenced but not declared."
    fp: "5f1b45c0b898"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:21:47.427Z"
  - id: "WIN-028"
    kind: "win"
    description: "Authoritative just verify completed successfully after the terminal cleanup race was corrected."
    fp: "c78fd336ce4a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:26:24.082Z"
  - id: "WIN-029"
    kind: "win"
    description: "Clean committed-tree just verify completed successfully across all canonical gates."
    fp: "9a9ed4b3bff8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:34:22.803Z"
  - id: "INS-109"
    kind: "insight"
    description: "Documentation claims no new application environment variable, but the diff adds ASCEND_FRONT_DOOR_TOKEN in API and Vite configuration."
    fp: "a13c572d19c0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:39:57.477Z"
  - id: "INS-110"
    kind: "insight"
    description: "The retained component and API matrices label rows executed, but many outcomes are assembled as static row objects rather than observed through the declared component or Fastify boundaries."
    fp: "347f20db76e3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:40:46.531Z"
  - id: "DL-512"
    kind: "difficulty"
    description: "The verifier's documentation audit expected rg, but this repository environment does not provide that search executable."
    fp: "f0367fe5d74f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:41:23.275Z"
  - id: "SUGG-016"
    kind: "improvement-suggestion"
    description: "After rg was unavailable, the documentation search had to backtrack to recursive grep."
    fp: "bc67e7ef06b6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:41:35.803Z"
  - id: "DL-513"
    kind: "difficulty"
    description: "Verifier feedback required a bounded implementation correction after the prior handoff."
    fp: "d4a86f1a99e3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:46:10.517Z"
  - id: "CONF-086"
    kind: "confusion"
    description: "Repository search required fallback because ripgrep was unavailable in the implementation environment."
    fp: "b924f2abed9e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:47:11.294Z"
  - id: "DL-514"
    kind: "difficulty"
    description: "A shell-sensitive source edit failed because nested quoting broke the literal Python command."
    fp: "e77663f4547e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:49:49.249Z"
  - id: "DL-515"
    kind: "difficulty"
    description: "A source replacement missed the formatted target block and required a narrower edit strategy."
    fp: "55672279bb97"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:51:10.251Z"
  - id: "DL-516"
    kind: "difficulty"
    description: "A JSX class replacement failed because nested double quotes were not preserved as one shell argument."
    fp: "daba7ac017a9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:54:29.163Z"
  - id: "DL-517"
    kind: "difficulty"
    description: "Focused validation exposed duplicate Projects controls and a missed focus-style source replacement."
    fp: "f6a3dc55c2ba"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T13:55:33.090Z"
  - id: "DL-518"
    kind: "difficulty"
    description: "Focused browser validation found a duplicate root route and a real-process workbench startup timeout."
    fp: "a44f8bf6661f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T14:13:17.776Z"
  - id: "DL-519"
    kind: "difficulty"
    description: "Full validation failed at the configured formatting gate for the corrective source and test edits."
    fp: "fbb6e380ab7e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T14:39:00.599Z"
  - id: "INS-111"
    kind: "insight"
    description: "Harness boot required more than thirty seconds while completing the canonical full verification proof."
    fp: "62021b0754a2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T14:50:36.026Z"
  - id: "DL-520"
    kind: "difficulty"
    description: "Final full validation required a tool wait longer than thirty seconds."
    fp: "709e7e953647"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:02:24.992Z"
  - id: "CONF-087"
    kind: "confusion"
    description: "The expected ripgrep helper was unavailable, so repository evidence inspection required grep."
    fp: "1abd4739848e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:03:13.552Z"
  - id: "DL-521"
    kind: "difficulty"
    description: "The repository environment lacked the python executable needed for observation parsing."
    fp: "4315e2d03313"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:04:59.328Z"
  - id: "DL-522"
    kind: "difficulty"
    description: "Complete branch diff output exceeded tool display limits and required chunked backtracking for inspection."
    fp: "3044da55410f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:17:49.889Z"
  - id: "DL-523"
    kind: "difficulty"
    description: "BL-012 browser scenario validation required a tool wait longer than thirty seconds."
    fp: "33507eb76db1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:22:55.275Z"
  - id: "CONF-088"
    kind: "confusion"
    description: "Real-process browser validation reported failure before detailed diagnostics became available."
    fp: "5da906bfd29e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:23:10.793Z"
  - id: "DL-524"
    kind: "difficulty"
    description: "Canonical just verify required a tool wait longer than thirty seconds to complete."
    fp: "903029d8a447"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:29:12.826Z"
  - id: "INS-112"
    kind: "insight"
    description: "Standalone BL-012 scenario timed out while canonical just verify later passed, exposing nondeterministic validation."
    fp: "f68d7d14b093"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:30:35.062Z"
  - id: "DL-525"
    kind: "difficulty"
    description: "Standalone browser gate exceeded its 120-second overall timeout while canonical verification later passed."
    fp: "8b2f093c66ca"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:32:47.581Z"
  - id: "CONF-089"
    kind: "confusion"
    description: "Repository diagnostics expected ripgrep, but the current environment does not provide the rg executable."
    fp: "17c37bd1dd81"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:33:31.569Z"
  - id: "INS-113"
    kind: "insight"
    description: "The timed-out browser scenario left its exact API and code-server process identities alive, creating later-run contention."
    fp: "d5de38619b75"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:35:14.989Z"
  - id: "CONF-090"
    kind: "confusion"
    description: "Repository editing expected a python executable, but this environment exposes Node tooling instead of python."
    fp: "b38ffb48bfd2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:38:36.941Z"
  - id: "DL-526"
    kind: "difficulty"
    description: "Focused timing validation exposed an incorrect eyeballed sum for the declared browser step bounds."
    fp: "05bc3d642dd7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:48:56.509Z"
  - id: "DL-527"
    kind: "difficulty"
    description: "Instrumented standalone browser validation failed at deterministic web readiness and required diagnosis."
    fp: "99dc4e365470"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:50:23.152Z"
  - id: "DL-528"
    kind: "difficulty"
    description: "Corrected browser run still lacked the expected Vite readiness event, requiring direct process-output inspection."
    fp: "69bbec60a10c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:51:46.641Z"
  - id: "DL-529"
    kind: "difficulty"
    description: "Direct Vite process inspection produced no readiness output within thirty seconds."
    fp: "11bf394fe74e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:52:11.175Z"
  - id: "INS-114"
    kind: "insight"
    description: "Real-process proof reached deterministic Vite readiness but exposed the runtime readiness step as the next slow boundary."
    fp: "7428fa6cdfbf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:56:15.396Z"
  - id: "INS-115"
    kind: "insight"
    description: "Runtime readiness produced neither success nor failure event, indicating navigation did not reach the expected API runtime boundary."
    fp: "95d7b161de2f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T15:58:18.169Z"
  - id: "DL-530"
    kind: "difficulty"
    description: "Preserving the loaded Vite configuration did not reach runtime startup, so the browser surface state remained ambiguous."
    fp: "bbbf5d6a9d2b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:00:18.261Z"
  - id: "DL-531"
    kind: "difficulty"
    description: "Safe diagnostics were needed after repeated runtime readiness failures to distinguish Home from stable-route navigation."
    fp: "44c8f76f6e18"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:04:14.639Z"
  - id: "INS-116"
    kind: "insight"
    description: "Unified workbench readiness timed out because the programmatic Vite child did not preserve stable-route proxy behavior."
    fp: "d172590c600e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:06:50.631Z"
  - id: "DL-532"
    kind: "difficulty"
    description: "The CLI-compatible Vite wrapper emitted no parseable readiness text through nested pipes, despite bounded process startup."
    fp: "7a16bef406ce"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:08:01.362Z"
  - id: "INS-117"
    kind: "insight"
    description: "Parallel disposable-port selection allowed API and web to receive the same released port, causing false listener readiness and Vite refusal."
    fp: "a2276200e315"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:09:16.946Z"
  - id: "DL-533"
    kind: "difficulty"
    description: "Distinct port reservation removed false readiness, but stable workbench document readiness still exceeded its declared step bound."
    fp: "49f830116f07"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:11:08.757Z"
  - id: "DL-534"
    kind: "difficulty"
    description: "Browser-class diagnostics were required because the stable shell remained visible without any runtime lifecycle event."
    fp: "9a8d9a799ab8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:12:59.012Z"
  - id: "INS-118"
    kind: "insight"
    description: "Running the API through tsx changed function-to-string shell output, so the browser script could reference transform helpers absent from the page."
    fp: "6150c81c37c2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:14:01.603Z"
  - id: "INS-119"
    kind: "insight"
    description: "Second standalone gate exposed a strict listener audit race on a transient runtime-group descendant that exited during /proc traversal."
    fp: "6dc4bafe533d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:20:59.377Z"
  - id: "INS-120"
    kind: "insight"
    description: "Stable runtime PID did not own the listener directly, requiring two-phase group discovery followed by strict owner confirmation."
    fp: "5dccaecf01fa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:24:01.151Z"
  - id: "DL-535"
    kind: "difficulty"
    description: "Canonical full validation failed after the standalone gates and required focused diagnosis."
    fp: "dc5ae20c05b1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:42:20.691Z"
  - id: "INS-121"
    kind: "insight"
    description: "Full validation exposed a late response observer added after the Promise.all snapshot and rejected during context cleanup."
    fp: "851e7d51dcc8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T16:43:17.135Z"
  - id: "COORD-067"
    kind: "coordination"
    description: "Final canonical verification and harness boot each required tool waits longer than thirty seconds."
    fp: "cc547d25fed0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T17:09:25.088Z"
  - id: "DL-536"
    kind: "difficulty"
    description: "Retro generation failed because nested JavaScript backslash escaping was not preserved through the shell argument."
    fp: "77d8736459e2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T17:12:32.446Z"
  - id: "DL-537"
    kind: "difficulty"
    description: "Final validation including the retro record failed late and required another retained output diagnosis."
    fp: "71428c642995"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T17:18:40.956Z"
  - id: "CONF-091"
    kind: "confusion"
    description: "Documentation inventory unexpectedly traversed a hidden .trees checkout and required scope correction."
    fp: "404bce9834b5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T17:50:55.656Z"
  - id: "COORD-068"
    kind: "coordination"
    description: "Standalone Home/workbench verification required a bounded tool wait longer than thirty seconds."
    fp: "f9e3d45b7624"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T17:55:23.510Z"
  - id: "DL-538"
    kind: "difficulty"
    description: "Third consecutive standalone gate failed after Vite reported readiness because the immediate Home fetch was refused."
    fp: "4f06a1359704"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T17:59:36.399Z"
  - id: "WIN-030"
    kind: "win"
    description: "Independent residual audit correctly rejected the partial failed continuity timing evidence while cleanup remained exact."
    fp: "d1a3aec184ad"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:00:19.053Z"
  - id: "COORD-069"
    kind: "coordination"
    description: "Canonical full verification required a bounded tool wait longer than thirty seconds."
    fp: "38ef09ffdebc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:05:53.007Z"
  - id: "CONF-092"
    kind: "confusion"
    description: "Observation list extraction unexpectedly found no target IDs in the saved output and required alternate parsing."
    fp: "36201640033d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:07:27.815Z"
  - id: "INS-122"
    kind: "insight"
    description: "Verifier feedback exposed inferred-only readiness from a Vite log hint instead of an HTTP consequence."
    fp: "7a7f9e6fd997"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:11:50.798Z"
  - id: "DL-539"
    kind: "difficulty"
    description: "Repository search expected ripgrep, but rg was unavailable in the implementation environment."
    fp: "34dc539cde5c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:12:23.188Z"
  - id: "DL-540"
    kind: "difficulty"
    description: "The environment lacked the python command alias, requiring an explicit python3 backtrack for repository edits."
    fp: "9354037a7507"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:14:37.853Z"
  - id: "DL-541"
    kind: "difficulty"
    description: "Focused readiness regressions timed out because the fake IPC hint was missed before the test attached its observer."
    fp: "d46a9d047c6e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:22:18.711Z"
  - id: "DL-542"
    kind: "difficulty"
    description: "Formatting and type-check recipes exposed style drift and an undefined timestamp narrowing defect."
    fp: "44b8cc4f5f4b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:24:59.532Z"
  - id: "DL-543"
    kind: "difficulty"
    description: "The first designated readiness gate exceeded a 30-second tool wait during real browser execution."
    fp: "aebec310854a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:28:40.621Z"
  - id: "DL-544"
    kind: "difficulty"
    description: "The designated continuity scenario failed on one stale apiAddress reference after API readiness refactoring."
    fp: "7ab230b00e0f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:28:46.915Z"
  - id: "DL-545"
    kind: "difficulty"
    description: "The expected external time binary was unavailable, so gate durations must use the shell SECONDS counter."
    fp: "f1c8ea623f3e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:30:26.009Z"
  - id: "DL-546"
    kind: "difficulty"
    description: "Final standalone Home workbench gate one required a bounded 134-second tool wait."
    fp: "286bc12bb47c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:33:08.432Z"
  - id: "DL-547"
    kind: "difficulty"
    description: "Final standalone Home workbench gate two required a bounded 131-second tool wait."
    fp: "35dc78907622"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:36:03.302Z"
  - id: "DL-548"
    kind: "difficulty"
    description: "Final standalone Home workbench gate three required a bounded 127-second tool wait."
    fp: "99a8ccafd497"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:38:40.139Z"
  - id: "DL-549"
    kind: "difficulty"
    description: "Focused documentation validation exposed that direct Prettier formatting changed a contract-sensitive Markdown table."
    fp: "165955eb24ab"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:42:58.762Z"
  - id: "DL-550"
    kind: "difficulty"
    description: "Corrected standalone Home workbench gate one required a bounded 136-second tool wait."
    fp: "a3d64322da0b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:46:50.761Z"
  - id: "DL-551"
    kind: "difficulty"
    description: "Corrected standalone Home workbench gate two required a bounded 127-second tool wait."
    fp: "047fa8c0c981"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:49:32.986Z"
  - id: "DL-552"
    kind: "difficulty"
    description: "Corrected standalone Home workbench gate three required a bounded 132-second tool wait."
    fp: "5a11ec75dbe5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:52:11.509Z"
  - id: "DL-553"
    kind: "difficulty"
    description: "Canonical full verification required a bounded 293-second tool wait and completed successfully."
    fp: "55325c8c4a9a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:57:59.613Z"
  - id: "DL-554"
    kind: "difficulty"
    description: "Harness boot failed because the BL-011 residual evidence test exceeded its fixed 10-second Vitest timeout under full-suite load."
    fp: "206b837b8ba2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T18:59:31.968Z"
  - id: "DL-555"
    kind: "difficulty"
    description: "Final harness boot required a bounded 307-second tool wait and completed with readiness ready."
    fp: "e71f03286072"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:05:40.297Z"
  - id: "DL-556"
    kind: "difficulty"
    description: "Post-commit continuity artifact regeneration required a bounded 126-second tool wait."
    fp: "e763f5359f98"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:10:59.724Z"
  - id: "DL-557"
    kind: "difficulty"
    description: "The repository image does not include rg, so diff navigation had to fall back to grep."
    fp: "19f85d1efb67"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:14:52.092Z"
  - id: "WIN-031"
    kind: "win"
    description: "The first no-retry Home workbench gate took over thirty seconds and completed with clean residuals."
    fp: "0f6f2fedb3e8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:18:41.996Z"
  - id: "WIN-032"
    kind: "win"
    description: "A subsequent no-retry Home workbench gate took over thirty seconds and completed with clean residuals."
    fp: "a8476610c0cc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:30:41.455Z"
  - id: "CONF-093"
    kind: "confusion"
    description: "Two parallel observation captures returned the same evidence ID, so final observation reporting required explicit result reconciliation."
    fp: "fc7109c4bcaf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:34:51.162Z"
  - id: "DL-558"
    kind: "difficulty"
    description: "Repository search command failed because ripgrep is unavailable despite expected tooling."
    fp: "c5e651245cbb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:54:35.097Z"
  - id: "CONF-094"
    kind: "confusion"
    description: "Targeted BL-004 evidence summary returned empty cohort fields because the retained schema differed."
    fp: "88090dd06b61"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T19:57:46.280Z"
  - id: "CONF-095"
    kind: "confusion"
    description: "Observation list search unexpectedly omitted the two records captured during this research stage."
    fp: "3772344fee04"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:02:16.178Z"
  - id: "DL-559"
    kind: "difficulty"
    description: "Architecture and source discovery output exceeded the tool display limit, requiring narrower file reads."
    fp: "5c85f56cc56c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:04:34.094Z"
  - id: "DL-560"
    kind: "difficulty"
    description: "The repository has no python executable; architecture edits must use python3 instead."
    fp: "a259d864e3f6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:07:41.331Z"
  - id: "DL-561"
    kind: "difficulty"
    description: "The combined architecture diff exceeded the display limit, requiring section-level validation."
    fp: "6a4d2d1b6f0d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:12:49.484Z"
  - id: "CONF-096"
    kind: "confusion"
    description: "The first structural plan validator failed ambiguously and required isolating which assertion was wrong."
    fp: "7620c82d096a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:13:48.458Z"
  - id: "DL-562"
    kind: "difficulty"
    description: "The repository-wide observation list exceeded the display limit, so this stage needs ID-filtered evidence."
    fp: "5783d75a3786"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:14:06.463Z"
  - id: "DL-563"
    kind: "difficulty"
    description: "The observation list was truncated at 64 KiB before jq parsing, so direct buffer lookup is required."
    fp: "ff6aa78c2f29"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:15:30.180Z"
  - id: "DL-564"
    kind: "difficulty"
    description: "I eyeballed the stable-routing document length and requested a range beyond its actual final line."
    fp: "70b5d15ab5bb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:16:18.718Z"
  - id: "DL-565"
    kind: "difficulty"
    description: "Repository search expected ripgrep, but rg is unavailable in this environment."
    fp: "5c5f2c81c379"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:19:36.218Z"
  - id: "DL-566"
    kind: "difficulty"
    description: "Repository editing expected python, but only python3 is available in this environment."
    fp: "e1c9f4a22e5f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:21:38.604Z"
  - id: "DL-567"
    kind: "difficulty"
    description: "The failed Python edit required backtracking to the available python3 executable."
    fp: "c2ae88beb5c0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:21:56.556Z"
  - id: "DL-568"
    kind: "difficulty"
    description: "A contract edit assertion failed because the expected token function text did not match exactly."
    fp: "50934c929ad6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:23:50.749Z"
  - id: "DL-569"
    kind: "difficulty"
    description: "The failed token edit required inspecting exact source and retrying with safer quoting."
    fp: "fc10bd99e817"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:24:38.744Z"
  - id: "DL-570"
    kind: "difficulty"
    description: "The proxy edit failed from nested shell quoting before any source change was applied."
    fp: "6f6cd9ed8edf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:25:49.761Z"
  - id: "DL-571"
    kind: "difficulty"
    description: "The failed proxy edit required backtracking to smaller quote-safe source transformations."
    fp: "62051228e345"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:25:49.808Z"
  - id: "DL-572"
    kind: "difficulty"
    description: "Focused validation failed and required diagnosis."
    fp: "7c0755e2cf6b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:27:57.910Z"
  - id: "DL-573"
    kind: "difficulty"
    description: "Focused runtime tests exposed expected event-token and explicit unhealthy-replacement contract changes."
    fp: "df7fdb0cf152"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:30:21.687Z"
  - id: "DL-574"
    kind: "difficulty"
    description: "Focused source-guard validation exposed Python escape corruption in generated regex word boundaries."
    fp: "21d91313c79b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:32:25.079Z"
  - id: "DL-575"
    kind: "difficulty"
    description: "Focused proxy validation failed because legacy runtime snapshot fixtures lacked new route and owner-token fields."
    fp: "9723f2c2e517"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:35:41.999Z"
  - id: "DL-576"
    kind: "difficulty"
    description: "Designated Chromium validation failed because Fastify server.addresses was inferred but unavailable at runtime."
    fp: "f0f9ddbde936"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:43:43.086Z"
  - id: "DL-577"
    kind: "difficulty"
    description: "Designated browser cleanup used the process-group helper with a PID, masking the underlying scenario result."
    fp: "ca0725c5b76a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:45:25.417Z"
  - id: "DL-578"
    kind: "difficulty"
    description: "The designated isolation recipe required more than 30 seconds to return its browser failure."
    fp: "c54164dc0935"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:45:47.677Z"
  - id: "DL-579"
    kind: "difficulty"
    description: "The runtime user-data edit hit nested shell quoting again and required smaller transformations."
    fp: "cbab25901756"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:49:19.475Z"
  - id: "DL-580"
    kind: "difficulty"
    description: "Designated editor evidence used a non-unique Monaco view-lines locator and triggered strict-mode failure."
    fp: "5af696e60696"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:51:25.359Z"
  - id: "DL-581"
    kind: "difficulty"
    description: "Designated terminal proof compared raw xterm path output, which was brittle under terminal rendering."
    fp: "ecfaedee602d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:52:42.981Z"
  - id: "DL-582"
    kind: "difficulty"
    description: "Shell command substitution expanded terminal-proof source text during editing and corrupted the generated test."
    fp: "286a2d55e637"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:53:39.616Z"
  - id: "DL-583"
    kind: "difficulty"
    description: "Designated reuse evidence hashed whole snapshots against identity-only objects, creating a false mismatch."
    fp: "c9951520d6a0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:55:08.802Z"
  - id: "DL-584"
    kind: "difficulty"
    description: "Bounded terminal marker validation still failed and required identifying the missing safe marker."
    fp: "fd8d29fb697a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:56:34.394Z"
  - id: "INS-123"
    kind: "insight"
    description: "Safe terminal diagnostics showed later Git markers were split by xterm wrapping while the first PWD marker remained intact."
    fp: "1e6b13743693"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:58:16.054Z"
  - id: "INS-124"
    kind: "insight"
    description: "Terminal evidence was contaminated by the shell echoing marker literals from the typed command itself."
    fp: "ec03016450ad"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T20:59:44.820Z"
  - id: "DL-585"
    kind: "difficulty"
    description: "Terminal Git evidence remained mismatched after removing command echo, requiring restricted raw authority diagnostics."
    fp: "e7afa0f64863"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:01:03.249Z"
  - id: "INS-125"
    kind: "insight"
    description: "Restricted terminal evidence showed the completion poll matched the typed command before shell execution."
    fp: "153d1b4612c2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:02:28.985Z"
  - id: "INS-126"
    kind: "insight"
    description: "Terminal scrollback retained cleared command text, so completion needed a marker absent from the typed command."
    fp: "e63e1462719d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:04:04.296Z"
  - id: "INS-127"
    kind: "insight"
    description: "Recursive fixture manifests treated Git index cache metadata refreshes as project integrity failures."
    fp: "0a56926b61b4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:05:40.975Z"
  - id: "DL-586"
    kind: "difficulty"
    description: "Focused designated validation exposed an unterminated newline literal in final evidence writing."
    fp: "fb0ae3017e66"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:09:16.284Z"
  - id: "DL-587"
    kind: "difficulty"
    description: "Residual audit inherited the pnpm workspace cwd instead of the repository root used by evidence paths."
    fp: "d20cf2f0f824"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:10:52.752Z"
  - id: "DL-588"
    kind: "difficulty"
    description: "Documentation editing was blocked because Markdown code ticks were interpreted as shell command substitution."
    fp: "738cde8ebbda"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:13:38.958Z"
  - id: "DL-589"
    kind: "difficulty"
    description: "Focused validation failed after the BL-013 documentation contract was added and required diagnosis."
    fp: "ae82151bbd9d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:18:06.216Z"
  - id: "DL-590"
    kind: "difficulty"
    description: "A documentation compatibility edit retried because the expected exact sentence did not match the current file."
    fp: "fa85dbdc538d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:19:49.442Z"
  - id: "DL-591"
    kind: "difficulty"
    description: "A runtime fixture edit retried because nested shell quoting corrupted a Python string before execution."
    fp: "8e6f3c2a16b0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:21:13.261Z"
  - id: "DL-592"
    kind: "difficulty"
    description: "Focused validation exposed case-sensitive compatibility phrases missing from two updated runbooks."
    fp: "e1215e4101a1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:22:48.761Z"
  - id: "DL-593"
    kind: "difficulty"
    description: "Marking the final task retried because its exact heading or status layout differed from the expected text."
    fp: "a7b17797cfc7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:23:59.474Z"
  - id: "INS-128"
    kind: "insight"
    description: "The designated BL-011 Chromium regression required more than thirty seconds to complete successfully."
    fp: "c717bcaa8282"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:29:52.864Z"
  - id: "DL-594"
    kind: "difficulty"
    description: "The BL-012 regression build exposed TypeScript errors in the new safe lifecycle-event contract and app callback type."
    fp: "2c2cd80334a1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:30:35.948Z"
  - id: "INS-129"
    kind: "insight"
    description: "The designated BL-012 three-scenario Chromium regression required more than thirty seconds and completed successfully."
    fp: "d4cf4e49bfad"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:34:18.926Z"
  - id: "DL-595"
    kind: "difficulty"
    description: "Full validation failed at the formatting gate because twelve BL-013 files needed repository style normalization."
    fp: "909a157ed8e7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:35:39.390Z"
  - id: "INS-130"
    kind: "insight"
    description: "The authoritative full repository validation required more than thirty seconds and completed successfully."
    fp: "8b2d72e57af7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T21:42:23.844Z"
  - id: "SUGG-017"
    kind: "improvement-suggestion"
    description: "The implementation commit was amended once so both configured trailers form one contiguous trailer block."
    fp: "cb6d61b21ee5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:05:48.384Z"
  - id: "DL-596"
    kind: "difficulty"
    description: "Complete diff inspection required splitting oversized tool output into smaller ranges."
    fp: "ecc02280ee71"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:13:11.323Z"
  - id: "DL-597"
    kind: "difficulty"
    description: "The repository image lacks rg, requiring grep-based source searches."
    fp: "77d14f810d14"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:14:08.518Z"
  - id: "DL-598"
    kind: "difficulty"
    description: "Authoritative just verify exceeded thirty seconds while running designated browser and regression gates."
    fp: "fedb5a2cd967"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:22:08.640Z"
  - id: "DL-599"
    kind: "difficulty"
    description: "The expected python command was unavailable while resolving the unique action plan, requiring a python3 retry."
    fp: "410438fcd57a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:24:24.568Z"
  - id: "COORD-070"
    kind: "coordination"
    description: "Resolving the unique action plan required retrying the file search with python3 after python was unavailable."
    fp: "1b284cfcc4e8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:24:38.588Z"
  - id: "DL-600"
    kind: "difficulty"
    description: "The expected ripgrep command was unavailable during source inspection, requiring grep-based searches instead."
    fp: "ada8ac9762c0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:26:56.091Z"
  - id: "COORD-071"
    kind: "coordination"
    description: "The task breakdown exceeded the file viewer limit and required bounded range reads before implementation."
    fp: "70dc94a95531"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:27:14.202Z"
  - id: "DL-601"
    kind: "difficulty"
    description: "The expected apply_patch helper was unavailable while editing the runtime fixture, requiring a Python file-edit retry."
    fp: "d0328d45ecf6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:30:41.423Z"
  - id: "DL-602"
    kind: "difficulty"
    description: "Focused executable isolation validation failed because a peer snapshot was unavailable after a selected failure cleanup."
    fp: "89e8f845855c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:37:55.130Z"
  - id: "DL-603"
    kind: "difficulty"
    description: "The focused matrix retry exposed an over-broad edit that inserted proxy cleanup into the cancellation scenario."
    fp: "a421cf528dc7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:38:50.537Z"
  - id: "CONF-097"
    kind: "confusion"
    description: "Focused evidence validation returned only a boolean failure, requiring artifact-level diagnosis of the rejected contract."
    fp: "5bb14a4b89a9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:39:46.778Z"
  - id: "DL-604"
    kind: "difficulty"
    description: "Type-check validation failed because strict evidence validator narrowing did not eliminate undefined event and observation records."
    fp: "e26a31a97f4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:47:44.042Z"
  - id: "DL-605"
    kind: "difficulty"
    description: "Real Chromium validation failed because the post-crash terminal helper selected a hidden pre-existing terminal instance."
    fp: "f437d89209f4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:50:18.221Z"
  - id: "INS-131"
    kind: "insight"
    description: "The Chromium retry observed an automatic B Management reconnect before replacement, requiring explicit failed-page closure."
    fp: "7b00200d4627"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:52:05.066Z"
  - id: "DL-606"
    kind: "difficulty"
    description: "Formatting validation failed after the large evidence and browser corrections and requires repository formatter application."
    fp: "ad4bcf1d25e4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:59:45.604Z"
  - id: "DL-607"
    kind: "difficulty"
    description: "The complete focused test suite failed after integration changes and requires diagnosis from the retained output."
    fp: "0db59a089762"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T22:59:49.246Z"
  - id: "DL-608"
    kind: "difficulty"
    description: "Focused documentation validation found the required Early exit phrase had been removed during the runbook rewrite."
    fp: "f19677083db4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:01:22.815Z"
  - id: "DL-609"
    kind: "difficulty"
    description: "Formatting validation still found drift in the large acceptance matrix after the first formatter pass."
    fp: "c196fe94cd82"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:01:26.635Z"
  - id: "COORD-072"
    kind: "coordination"
    description: "The documentation contract retry exposed another exact legacy phrase requirement for repository-only test authority."
    fp: "6a6f51084a8a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:02:25.112Z"
  - id: "COORD-073"
    kind: "coordination"
    description: "The designated BL-013 gate required more than thirty seconds to complete its matrices, Chromium episode, and residual audit."
    fp: "938f03618f9b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:04:44.404Z"
  - id: "COORD-074"
    kind: "coordination"
    description: "The complete just verify regression gate required more than thirty seconds and completed all prior and BL-013 browser audits."
    fp: "342b1ba826d0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:11:00.529Z"
  - id: "COORD-075"
    kind: "coordination"
    description: "The clean final just verify run exceeded thirty seconds while completing all prior regressions and the real BL-013 Chromium audit."
    fp: "39e571273820"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:25:24.137Z"
  - id: "WIN-033"
    kind: "win"
    description: "The verifier corrections now execute all isolation boundaries and pass focused, Chromium, residual, and full validation."
    fp: "17e8ef81acfd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:26:28.597Z"
  - id: "DL-610"
    kind: "difficulty"
    description: "Repository verification expected rg for scoped code and documentation searches, but rg is unavailable in the verifier environment."
    fp: "87ef446c6d2d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:31:43.408Z"
  - id: "COORD-076"
    kind: "coordination"
    description: "Verification backtracked from unavailable rg to portable grep while preserving the same scoped test and documentation inspection."
    fp: "86ce35795d74"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:32:00.253Z"
  - id: "DL-611"
    kind: "difficulty"
    description: "A parallel file-range read guessed beyond the research file end, requiring a bounded retry from the reported final visible line."
    fp: "e404844e6908"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:33:47.748Z"
  - id: "DL-612"
    kind: "difficulty"
    description: "The root README exceeded the single-read size bound, requiring bounded range reads to complete application documentation review."
    fp: "165dcfd77e46"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:34:23.174Z"
  - id: "DL-613"
    kind: "difficulty"
    description: "A generated evidence summary used long JSON lines, so a guessed second range exceeded the actual line count and required a targeted final-line retry."
    fp: "b14c388e9b58"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:35:24.215Z"
  - id: "DL-614"
    kind: "difficulty"
    description: "Authoritative just verify exited nonzero during independent verification and requires inspection of the saved full validation output."
    fp: "0e5cf9f49c58"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:37:14.441Z"
  - id: "DL-615"
    kind: "difficulty"
    description: "The independent full just verify command ran longer than thirty seconds before returning its nonzero validation result."
    fp: "cd0b4ff9673b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:37:30.162Z"
  - id: "DL-616"
    kind: "difficulty"
    description: "The initial action-plan lookup used unavailable python and required retrying with python3."
    fp: "fcc12103072a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:40:13.246Z"
  - id: "DL-617"
    kind: "difficulty"
    description: "The repository search command rg was unavailable and required fallback to grep."
    fp: "05f5ca566339"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:41:54.149Z"
  - id: "DL-618"
    kind: "difficulty"
    description: "The first runtime-manager patch did not match the exact source block and required a narrower retry."
    fp: "5e7965043bbe"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:45:41.394Z"
  - id: "DL-619"
    kind: "difficulty"
    description: "The shutdown evidence patch missed a formatted assertion block and required another source-aligned retry."
    fp: "318f0a5fa9e3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:47:40.330Z"
  - id: "DL-620"
    kind: "difficulty"
    description: "Focused runtime validation failed because tracked exit tasks remained pending in legacy test doubles."
    fp: "856176dcdfe3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:49:26.292Z"
  - id: "DL-621"
    kind: "difficulty"
    description: "Focused runtime validation took more than 30 seconds while pending exit tasks timed out."
    fp: "c6f8f0d25916"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:49:26.411Z"
  - id: "DL-622"
    kind: "difficulty"
    description: "The WebSocket fixture patch missed quote-formatted source text and required a source-aligned retry."
    fp: "745efeeda5b1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:50:50.018Z"
  - id: "DL-623"
    kind: "difficulty"
    description: "The AC-18 validator patch missed single-quoted source conditions and required a narrower retry."
    fp: "92a0f67b724f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:55:47.044Z"
  - id: "DL-624"
    kind: "difficulty"
    description: "Strict fake-matrix validation rejected the positive artifact and required expectation-level diagnosis."
    fp: "04a4dcc25e62"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:57:02.656Z"
  - id: "DL-625"
    kind: "difficulty"
    description: "Regenerated strict matrix still failed positive validation and required inspecting retained evidence."
    fp: "4faf8385be51"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-12T23:57:55.575Z"
  - id: "DL-626"
    kind: "difficulty"
    description: "The proxy regression patch hit shell quoting on test titles and required a quote-safe retry."
    fp: "7494413bb22c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:00:50.640Z"
  - id: "DL-627"
    kind: "difficulty"
    description: "The documentation contract patch hit shell quoting and required a quote-safe insertion retry."
    fp: "b377072588d6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:04:44.686Z"
  - id: "DL-628"
    kind: "difficulty"
    description: "Type-check validation found a possibly undefined cross-target row after strict attribution changes."
    fp: "44953206571a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:06:23.501Z"
  - id: "DL-629"
    kind: "difficulty"
    description: "Default Prettier formatting ignored repository configuration and required a config-aware retry."
    fp: "6e9b06a02bdf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:07:47.173Z"
  - id: "DL-630"
    kind: "difficulty"
    description: "The focused BL-013 gate with real Chromium took more than 30 seconds to complete."
    fp: "dfd39ab4fb96"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:10:04.004Z"
  - id: "DL-631"
    kind: "difficulty"
    description: "The task-evidence update found a different T-9 evidence sentence and required a source-aligned retry."
    fp: "c2fefa15f3e7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:10:57.333Z"
  - id: "DL-632"
    kind: "difficulty"
    description: "The task-breakdown view range exceeded the file length and required a bounded retry."
    fp: "98ba6a567a63"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:11:13.919Z"
  - id: "DL-633"
    kind: "difficulty"
    description: "The full-validation output view exceeded the saved line count and required a bounded tail retry."
    fp: "d1eb655db2a2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:17:47.183Z"
  - id: "DL-634"
    kind: "difficulty"
    description: "Full just verify took more than 30 seconds while completing serial browser regression gates."
    fp: "752eb1e0bb1d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:18:04.576Z"
  - id: "DL-635"
    kind: "difficulty"
    description: "Final full validation timed out in the stable-route residual test under suite contention and required diagnosis."
    fp: "c6f7c1a9a2d0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:21:13.490Z"
  - id: "DL-636"
    kind: "difficulty"
    description: "The residual walk optimization patch missed quote-formatted source and required an index-based retry."
    fp: "8f02606bf456"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:23:32.870Z"
  - id: "DL-637"
    kind: "difficulty"
    description: "The successful final just verify rerun took more than 30 seconds across serial browser gates."
    fp: "c7e68c3c5549"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:30:39.156Z"
  - id: "DL-638"
    kind: "difficulty"
    description: "A grouped application diff exceeded the tool output limit and required chunked inspection."
    fp: "6232c7155098"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:36:26.497Z"
  - id: "DL-639"
    kind: "difficulty"
    description: "Grouped documentation and architecture diffs exceeded output limits and required range-by-range review."
    fp: "82b23673205e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:38:36.085Z"
  - id: "CONF-098"
    kind: "confusion"
    description: "A line-range estimate exceeded the research file length and required a corrected bounded read."
    fp: "ec376cab8753"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:39:08.093Z"
  - id: "DL-640"
    kind: "difficulty"
    description: "The complete BL-013 isolation gate waited over 30 seconds while Chromium and residual audits completed."
    fp: "22043b8ee0ef"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:41:13.460Z"
  - id: "DL-641"
    kind: "difficulty"
    description: "The authoritative just verify run waited over 30 seconds and produced output requiring bounded result inspection."
    fp: "51805008f22e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:47:39.416Z"
  - id: "DL-642"
    kind: "difficulty"
    description: "The expected ripgrep executable was unavailable while checking early-exit cleanup coverage, requiring grep fallback."
    fp: "4097cd8b6b72"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:49:41.514Z"
  - id: "INS-132"
    kind: "insight"
    description: "Shutdown zero-task evidence required source inspection because explicit Set.clear calls can mask unsettled work."
    fp: "ef15e0a3104e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:50:28.511Z"
  - id: "DL-643"
    kind: "difficulty"
    description: "The expected python executable was unavailable while applying the runtime manager correction."
    fp: "328f28792fdf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:57:59.575Z"
  - id: "DL-644"
    kind: "difficulty"
    description: "Shell quoting failed while patching the mocked runtime termination helper and required a safer edit."
    fp: "7a06535627d3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:58:42.323Z"
  - id: "DL-645"
    kind: "difficulty"
    description: "The delayed shutdown test insertion marker used the wrong quote style and required source-aligned retry."
    fp: "cbfdcfd8daad"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T00:59:26.221Z"
  - id: "DL-646"
    kind: "difficulty"
    description: "Focused frame isolation validation failed because the strict matrix validator rejected generated evidence."
    fp: "71168dc42eb2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:03:20.101Z"
  - id: "DL-647"
    kind: "difficulty"
    description: "The focused BL-013 gate exposed a lifecycle mock whose process exit promise never settled after termination."
    fp: "d3f99a6f4ff3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:10:38.624Z"
  - id: "DL-648"
    kind: "difficulty"
    description: "The designated Chromium isolation gate ran longer than thirty seconds before reporting its result."
    fp: "340b2043f34e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:13:06.798Z"
  - id: "DL-649"
    kind: "difficulty"
    description: "Real Chromium terminal proof failed because the exact Git status shell command did not reach completion."
    fp: "c450140ae39c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:13:06.921Z"
  - id: "DL-650"
    kind: "difficulty"
    description: "The repeated designated Chromium correction run again exceeded thirty seconds before failure."
    fp: "f6d2e909dca0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:14:48.836Z"
  - id: "DL-651"
    kind: "difficulty"
    description: "The one-line exact Git status terminal command still failed to emit the completion marker in Chromium."
    fp: "73cf60372683"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:14:48.972Z"
  - id: "DL-652"
    kind: "difficulty"
    description: "The third designated Chromium run exceeded thirty seconds while concurrent peer terminal creation remained unstable."
    fp: "86029f2c246b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:17:28.166Z"
  - id: "INS-133"
    kind: "insight"
    description: "Concurrent A and C terminal creation after the B crash prevented one completion marker and required serialization."
    fp: "b1fd13ef0549"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:17:28.432Z"
  - id: "DL-653"
    kind: "difficulty"
    description: "The serialized fourth Chromium run still exceeded thirty seconds before the reused workbench terminal diagnosis."
    fp: "c734e51df313"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:19:14.864Z"
  - id: "SUGG-018"
    kind: "improvement-suggestion"
    description: "Creating a new post-crash peer terminal was unnecessary; probing the already-running terminal better tests continuity."
    fp: "ebdca32133ff"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:19:15.499Z"
  - id: "WIN-034"
    kind: "win"
    description: "The successful real Chromium isolation proof required more than thirty seconds to complete."
    fp: "193fa81ce532"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:21:14.632Z"
  - id: "DL-654"
    kind: "difficulty"
    description: "Full validation failed at the repository formatting gate for three edited TypeScript test files."
    fp: "c82791884da7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:24:26.616Z"
  - id: "DL-655"
    kind: "difficulty"
    description: "Full validation reached type checking and found an optional send-attempt record was not narrowed safely."
    fp: "977d14b122e9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:25:31.719Z"
  - id: "DL-656"
    kind: "difficulty"
    description: "Full validation produced truncated output and a nonzero exit, requiring inspection of the retained command log."
    fp: "fa1284595997"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:27:16.927Z"
  - id: "DL-657"
    kind: "difficulty"
    description: "The failed complete repository validation ran longer than thirty seconds before returning its result."
    fp: "ecb4119155b7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:27:33.696Z"
  - id: "DL-658"
    kind: "difficulty"
    description: "The next full validation rerun again returned a nonzero result with output retained outside the visible window."
    fp: "a01f96c00ae1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:29:50.763Z"
  - id: "DL-659"
    kind: "difficulty"
    description: "The repeated full repository validation ran longer than thirty seconds before failing."
    fp: "6f37cb9a3ddd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:29:51.201Z"
  - id: "DL-660"
    kind: "difficulty"
    description: "Authoritative full validation still returned a nonzero result with the detailed output retained separately."
    fp: "54014500976b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:33:30.563Z"
  - id: "DL-661"
    kind: "difficulty"
    description: "The authoritative full validation attempt exceeded thirty seconds before returning failure."
    fp: "334d3c2da0c2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:33:30.625Z"
  - id: "WIN-035"
    kind: "win"
    description: "The successful browser regression gate required more than thirty seconds after the contention-bound correction."
    fp: "1b813d2ffa5a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:36:12.136Z"
  - id: "DL-662"
    kind: "difficulty"
    description: "The continued full validation attempt exceeded thirty seconds before returning failure."
    fp: "ac40aa5afeee"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:38:18.372Z"
  - id: "DL-663"
    kind: "difficulty"
    description: "The final full validation attempt still returned nonzero and required another retained-log inspection."
    fp: "b3aabe8376b5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:38:18.618Z"
  - id: "WIN-036"
    kind: "win"
    description: "The direct terminal shortcut browser regression passed after more than thirty seconds of execution."
    fp: "4494b679246b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:40:29.680Z"
  - id: "DL-664"
    kind: "difficulty"
    description: "The final full validation remained active beyond five minutes while completing designated browser gates."
    fp: "3048dff7b1a2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:46:20.260Z"
  - id: "WIN-037"
    kind: "win"
    description: "The final authoritative full validation completed successfully after all designated gates and residual audits."
    fp: "e6de90e9ffb4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:46:58.709Z"
  - id: "DL-665"
    kind: "difficulty"
    description: "The initial exact action-plan lookup failed because python is unavailable, requiring a retry with python3."
    fp: "37575939205a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:52:30.818Z"
  - id: "DL-666"
    kind: "difficulty"
    description: "Repository searches failed because ripgrep is unavailable, requiring literal grep retries for documentation review."
    fp: "2bb3cdbce59c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:56:53.532Z"
  - id: "INS-134"
    kind: "insight"
    description: "The shutdown evidence labels a bounded wait but records no measured duration, exposing an eyeballed deadline constraint."
    fp: "c9790f306470"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T01:58:43.185Z"
  - id: "CONF-099"
    kind: "confusion"
    description: "The observation-list search unexpectedly returned no verifier IDs despite successful capture responses."
    fp: "4577a9bea5a8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:00:06.452Z"
  - id: "DL-667"
    kind: "difficulty"
    description: "Repository search required falling back because the ripgrep executable is unavailable."
    fp: "b5fc34eeda7c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:03:22.840Z"
  - id: "DL-668"
    kind: "difficulty"
    description: "Repository editing required switching to python3 because the python executable alias is unavailable."
    fp: "0ce2274897db"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:07:29.419Z"
  - id: "DL-669"
    kind: "difficulty"
    description: "The failed repository edit had to be retried with the available python3 executable."
    fp: "ba33f03509ae"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:07:52.546Z"
  - id: "DL-670"
    kind: "difficulty"
    description: "The combined documentation edit was blocked because shell-sensitive Markdown required safer literal handling."
    fp: "77d8e6f7553f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:13:19.507Z"
  - id: "CONF-100"
    kind: "confusion"
    description: "Documentation assertion edits failed because the selected anchors used the wrong quote style."
    fp: "1a0506ecc0fa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:14:36.661Z"
  - id: "DL-671"
    kind: "difficulty"
    description: "The complete focused isolation gate waited over 30 seconds for its no-retry Chromium episode."
    fp: "26c6611dfe5d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:17:48.295Z"
  - id: "DL-672"
    kind: "difficulty"
    description: "Full validation failed because the isolation acceptance test did not satisfy repository formatting."
    fp: "23b4cacbd88d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:18:51.980Z"
  - id: "DL-673"
    kind: "difficulty"
    description: "The second full validation attempt showed the manual test formatting correction was still incomplete."
    fp: "907bb8ab4873"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:20:52.094Z"
  - id: "DL-674"
    kind: "difficulty"
    description: "The successful full verification waited over 30 seconds across the complete unit and browser regression suite."
    fp: "f370e66ee58e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:27:24.594Z"
  - id: "CONF-101"
    kind: "confusion"
    description: "Implementation-note update required a retry after one evidence anchor did not match the existing prose."
    fp: "8fdc68a21080"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:28:48.727Z"
  - id: "DL-675"
    kind: "difficulty"
    description: "Final full validation failed after a long run and truncated output required diagnosis."
    fp: "df8dd34bc9de"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:36:45.737Z"
  - id: "INS-135"
    kind: "insight"
    description: "The browser failure showed a visible terminal without command completion, so terminal readiness remained inferred."
    fp: "149341242fd5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:38:32.719Z"
  - id: "DL-676"
    kind: "difficulty"
    description: "The terminal-stability edit required a retry because nested shell quoting truncated the replacement script."
    fp: "0340b6056e88"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:39:37.803Z"
  - id: "DL-677"
    kind: "difficulty"
    description: "Focused Chromium validation still failed because replacement terminal commands did not produce their marker."
    fp: "705655222dee"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:41:25.304Z"
  - id: "DL-678"
    kind: "difficulty"
    description: "Terminal prompt readiness was insufficient because the replacement proof marker still timed out."
    fp: "e9f07b56db3e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:43:13.171Z"
  - id: "DL-679"
    kind: "difficulty"
    description: "Scoping keyboard input to the selected terminal did not resolve replacement command settlement."
    fp: "bbbf916a9eee"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:44:59.605Z"
  - id: "DL-680"
    kind: "difficulty"
    description: "Residual audit after browser failure could not run because the failed episode removed its public artifact."
    fp: "3b6206298025"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:46:03.322Z"
  - id: "DL-681"
    kind: "difficulty"
    description: "Git restore exposed an unavailable git-personas hook dependency even though the file restore succeeded."
    fp: "ee58f3008592"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:46:39.929Z"
  - id: "WIN-038"
    kind: "win"
    description: "The corrected focused isolation rerun waited over 30 seconds and completed successfully with clean residuals."
    fp: "6a08ab1e5277"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:47:57.381Z"
  - id: "DL-682"
    kind: "difficulty"
    description: "Full validation failed again after the focused gate passed, requiring another truncated-output diagnosis."
    fp: "f61347658654"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:54:21.207Z"
  - id: "WIN-039"
    kind: "win"
    description: "The finite 30-second operation bound stabilized the focused no-retry Chromium gate under contention."
    fp: "af28f2da611f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T02:56:27.230Z"
  - id: "DL-683"
    kind: "difficulty"
    description: "Full validation still failed under accumulated suite contention despite the larger finite operation bound."
    fp: "66ae42f36a7b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:02:46.812Z"
  - id: "DL-684"
    kind: "difficulty"
    description: "Full validation remained unstable after exact identity termination, requiring inspection of the latest failure point."
    fp: "fe1ff617b190"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:12:00.774Z"
  - id: "INS-136"
    kind: "insight"
    description: "A 60-second bound proved the replacement terminal was non-settling rather than merely slow."
    fp: "a4c2d106f42f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:15:02.705Z"
  - id: "DL-685"
    kind: "difficulty"
    description: "Exact command-palette selection created a terminal but its replacement shell command still did not settle."
    fp: "8f5d5d9a7f9c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:17:26.956Z"
  - id: "DL-686"
    kind: "difficulty"
    description: "Exact leaked process-group cleanup was blocked because the terminal policy rejected negative group identifiers."
    fp: "f557dc146ef5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:18:28.401Z"
  - id: "CONF-102"
    kind: "confusion"
    description: "The command palette did not expose the assumed exact terminal command label, invalidating that selector."
    fp: "aae1ed647c6f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:21:38.136Z"
  - id: "DL-687"
    kind: "difficulty"
    description: "The direct terminal shortcut did not create a terminal in the fresh replacement context."
    fp: "f620e378977d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:23:48.680Z"
  - id: "DL-688"
    kind: "difficulty"
    description: "Final full validation failed before browser completion after the fresh-context changes."
    fp: "eeb76d9c7cf3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:26:46.359Z"
  - id: "DL-689"
    kind: "difficulty"
    description: "Full validation again failed during the parallel unit phase despite cleaning exact leaked services."
    fp: "5ed4125c904d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:30:08.642Z"
  - id: "CONF-103"
    kind: "confusion"
    description: "Browser evidence-note updates needed another retry because one acceptance anchor differed from the task prose."
    fp: "e79035a11548"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:32:54.612Z"
  - id: "WIN-040"
    kind: "win"
    description: "Final full validation completed successfully after timing, privacy, cleanup, and contention corrections."
    fp: "006c9c037b7e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:41:15.808Z"
  - id: "DL-690"
    kind: "difficulty"
    description: "The repository image lacks rg, so source inspection had to backtrack to grep despite common tooling assumptions."
    fp: "e03ace0d1aa6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:50:24.373Z"
  - id: "WIN-041"
    kind: "win"
    description: "The focused BL-013 gate required a Chromium run longer than 30 seconds before returning successful evidence."
    fp: "04332dea761c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:53:03.878Z"
  - id: "WIN-042"
    kind: "win"
    description: "The authoritative just verify gate ran longer than 30 seconds and completed successfully with all configured regressions."
    fp: "89247f20fdfb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T03:59:57.713Z"
  - id: "DL-691"
    kind: "difficulty"
    description: "The environment exposes python3 but not python, so pull-request body generation had to backtrack after an unavailable executable."
    fp: "c35dc885e06e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:02:54.534Z"
  - id: "DL-692"
    kind: "difficulty"
    description: "BL-014 pre-flight full suite failed a proxy failure-category event assertion"
    fp: "691da383f37a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:19:50.344Z"
  - id: "DL-693"
    kind: "difficulty"
    description: "First full harness boot failed the workbench-route-acceptance.test.ts category-event assertion, while the focused file immediately passed; this is a full-suite validation stability gap, not evidence of product failure."
    fp: "59fc625c4b8f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:24:44.757Z"
  - id: "DL-694"
    kind: "difficulty"
    description: "Second full harness boot failed the designated workbench-proof.spec.ts terminal parity check by overall timeout after 2.3 minutes while other tests passed; this is a full-suite validation stability gap, not evidence of product failure."
    fp: "f2a494f81bbf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:24:44.793Z"
  - id: "DL-695"
    kind: "difficulty"
    description: "Repository search command failed because ripgrep is unavailable in the environment, requiring a fallback to grep for evidence discovery."
    fp: "abe0d7c576e7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:25:24.331Z"
  - id: "DL-696"
    kind: "difficulty"
    description: "The documented code-server library path was absent even though the executable exists and reports version 4.131.0, requiring executable-path resolution before inspecting server session behavior."
    fp: "a12fb78effe8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:27:53.060Z"
  - id: "CONF-104"
    kind: "confusion"
    description: "Generated BL-012 evidence files currently had residual-audit fixture shapes instead of full browser fields, requiring schema inspection and merged source evidence to avoid an ambiguous interpretation."
    fp: "13b34a25d228"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:33:41.628Z"
  - id: "INS-137"
    kind: "insight"
    description: "The installed code-server README did not define terminal reconnection ownership, so bundled VS Code configuration and server code had to be inspected to avoid inferred-only runtime behavior."
    fp: "d907257f1a83"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:33:41.753Z"
  - id: "DL-697"
    kind: "difficulty"
    description: "Broad repository and test searches exceeded output limits multiple times, requiring bounded file-specific reads and targeted grep queries."
    fp: "b6e86779570c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:33:42.129Z"
  - id: "DL-698"
    kind: "difficulty"
    description: "The first research brief write attempt was blocked by shell security because the long literal content triggered expansion-pattern detection, requiring a safer non-shell file creation method."
    fp: "5370378a7f78"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:36:23.923Z"
  - id: "DL-699"
    kind: "difficulty"
    description: "The final harness observation listing exceeded the tool output limit because it included repository-wide history, so stage evidence had to use the captured IDs from individual successful calls."
    fp: "4177b566e995"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:39:33.605Z"
  - id: "DL-700"
    kind: "difficulty"
    description: "Reading the long research brief required a backtrack after guessed line ranges exceeded its 100 long lines."
    fp: "6c3927220fa6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:42:07.022Z"
  - id: "INS-138"
    kind: "insight"
    description: "Proxy event ordering and editor restoration ownership remain hypotheses until contention and browser evidence execute."
    fp: "1baee24e05d6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:45:33.027Z"
  - id: "DL-701"
    kind: "difficulty"
    description: "Creating the action plan failed because the environment exposes python3 but not the python command."
    fp: "05d0e5e0cf16"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:46:34.816Z"
  - id: "CONF-105"
    kind: "confusion"
    description: "The first acceptance coverage validator parsed only the task cell, so its test-reference assertion failed ambiguously."
    fp: "f4f7565df4f5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:50:42.493Z"
  - id: "DL-702"
    kind: "difficulty"
    description: "Repository search command failed with exit 127 while locating Phase 0 targets."
    fp: "9f2d58df7761"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:53:43.941Z"
  - id: "DL-703"
    kind: "difficulty"
    description: "The planned Python edit tool was unavailable while applying the proxy event correction."
    fp: "40631a4e266c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:55:20.774Z"
  - id: "DL-704"
    kind: "difficulty"
    description: "The first terminal-loop edit was blocked because source interpolation resembled unsafe shell expansion."
    fp: "b3656f644159"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T04:58:35.577Z"
  - id: "DL-705"
    kind: "difficulty"
    description: "Focused BL-014 evidence validation exposed missing workflow token attribution rejection."
    fp: "b9a4a71f0872"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:02:29.964Z"
  - id: "DL-706"
    kind: "difficulty"
    description: "The first justfile recipe insertion failed because nested shell quoting truncated the edit."
    fp: "ac3aeba0a1d1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:07:41.145Z"
  - id: "DL-707"
    kind: "difficulty"
    description: "The designated BL-014 gate failed because copied browser setup configured serial mode twice."
    fp: "9e03ae2d4b44"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:08:32.915Z"
  - id: "COORD-077"
    kind: "coordination"
    description: "The designated BL-014 browser proof required more than thirty seconds to execute."
    fp: "6dd643a2de76"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:10:48.892Z"
  - id: "DL-708"
    kind: "difficulty"
    description: "The BL-014 return assertion chased an exact counter value that scrolled from the live terminal."
    fp: "27d1f40e0a51"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:10:49.104Z"
  - id: "COORD-078"
    kind: "coordination"
    description: "The corrected BL-014 browser proof again required more than thirty seconds to execute."
    fp: "33fb51c63c21"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:13:30.582Z"
  - id: "INS-139"
    kind: "insight"
    description: "The B revisit restored its terminal server state with the terminal panel initially hidden."
    fp: "995990c1ccd4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:13:31.399Z"
  - id: "COORD-079"
    kind: "coordination"
    description: "The retained-terminal BL-014 browser proof required more than thirty seconds to execute."
    fp: "041b435c7816"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:16:40.743Z"
  - id: "INS-140"
    kind: "insight"
    description: "Two reconnections reused the existing ExtensionHost channel and opened only a new Management channel."
    fp: "956ab4419054"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:16:40.979Z"
  - id: "COORD-080"
    kind: "coordination"
    description: "The socket-role BL-014 browser proof required more than thirty seconds to execute."
    fp: "ed1212238a3c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:19:10.239Z"
  - id: "INS-141"
    kind: "insight"
    description: "A return occasionally restored the terminal backend while leaving its panel hidden."
    fp: "4fbe6c1066a0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:19:10.400Z"
  - id: "WIN-043"
    kind: "win"
    description: "The complete no-retry BL-014 Chromium gate passed after a validation run over thirty seconds."
    fp: "e84bf83d50d4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:21:48.807Z"
  - id: "DL-709"
    kind: "difficulty"
    description: "The first runbook edit was blocked because Markdown code delimiters resembled shell substitution."
    fp: "752f58f67185"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:23:08.678Z"
  - id: "DL-710"
    kind: "difficulty"
    description: "The BL-010 regression exceeded thirty seconds and timed out under the expanded validation load."
    fp: "4007f4b8ac3c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:25:43.030Z"
  - id: "DL-711"
    kind: "difficulty"
    description: "The measured BL-010 regression still hung beyond forty-five seconds, showing a real settlement defect rather than scheduler margin."
    fp: "639ee220b118"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:27:49.881Z"
  - id: "WIN-044"
    kind: "win"
    description: "The passing BL-011 browser regression required more than thirty seconds to execute."
    fp: "c65554cf61e0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:31:57.092Z"
  - id: "WIN-045"
    kind: "win"
    description: "The passing BL-012 browser regression required more than thirty seconds to execute."
    fp: "fea74dd457e9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:34:32.119Z"
  - id: "WIN-046"
    kind: "win"
    description: "The passing BL-013 browser regression required more than thirty seconds to execute."
    fp: "2d402a82f469"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:35:38.661Z"
  - id: "DL-712"
    kind: "difficulty"
    description: "Formatting validation failed on newly added BL-014 TypeScript and Playwright files."
    fp: "1bca97c68cf0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:36:16.424Z"
  - id: "DL-713"
    kind: "difficulty"
    description: "Full validation failed on package-relative BL-014 fixture lookup and BL-013 contention evidence bounds."
    fp: "293557bce490"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:37:52.123Z"
  - id: "DL-714"
    kind: "difficulty"
    description: "Formatting validation failed on the new BL-013 numeric-boundary regression test."
    fp: "3c509fd0e5d3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:41:17.641Z"
  - id: "WIN-047"
    kind: "win"
    description: "The full authoritative validation passed after a multi-minute no-retry run."
    fp: "3486a8d98e76"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:48:57.474Z"
  - id: "COORD-081"
    kind: "coordination"
    description: "Harness boot required more than thirty seconds before reporting a checks failure."
    fp: "fd1056bf621f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:50:26.390Z"
  - id: "DL-715"
    kind: "difficulty"
    description: "Harness boot exposed a capacity workload sampling race under full contention."
    fp: "32a5c75ba88b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:50:26.588Z"
  - id: "SUGG-019"
    kind: "improvement-suggestion"
    description: "Selecting a five-second test workload bound required an explicit full-contention scheduling margin."
    fp: "5bf93241d7d1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:51:25.817Z"
  - id: "WIN-048"
    kind: "win"
    description: "The final full validation passed after the boot contention correction in a multi-minute run."
    fp: "f9409dab46c2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T05:59:59.621Z"
  - id: "DL-716"
    kind: "difficulty"
    description: "Harness boot showed the one-second proxy event-settlement bound was insufficient under full contention."
    fp: "58dd883fe8c6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:01:27.716Z"
  - id: "COORD-082"
    kind: "coordination"
    description: "The second harness boot required more than thirty seconds before exposing event-settlement contention."
    fp: "c55ada58456d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:01:27.828Z"
  - id: "DL-717"
    kind: "difficulty"
    description: "Prettier rejected the newly added bounded proxy settlement formatting."
    fp: "a36a21b45c95"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:02:47.237Z"
  - id: "CONF-106"
    kind: "confusion"
    description: "Repository inspection expected ripgrep, but the environment did not provide it."
    fp: "cefe07776b0f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:04:45.388Z"
  - id: "CONF-107"
    kind: "confusion"
    description: "The assumed terminal evidence path was absent after the designated proof."
    fp: "fe26327b875c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:14:26.096Z"
  - id: "DL-718"
    kind: "difficulty"
    description: "The cleanup inventory insertion anchor did not match the formatted source."
    fp: "79d44865fb5f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:16:42.083Z"
  - id: "DL-719"
    kind: "difficulty"
    description: "Harness boot full contention made two capacity command classifications time out."
    fp: "27a42de23c4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:32:41.059Z"
  - id: "DL-720"
    kind: "difficulty"
    description: "Full validation contention exceeded the default five-second component test deadline."
    fp: "c5c8457f042d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:35:59.027Z"
  - id: "WIN-049"
    kind: "win"
    description: "Harness boot required 522627 ms but completed within its declared finite readiness bound."
    fp: "d97d54d372f7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T06:54:55.078Z"
  - id: "WIN-050"
    kind: "win"
    description: "The final full validation completed successfully after a multi-minute tool wait."
    fp: "c2e726afad4e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:06:40.362Z"
  - id: "INS-142"
    kind: "insight"
    description: "BL-014 browser evidence assigns lifecycle, storage-clear, and cleanup claims instead of deriving every acceptance value."
    fp: "324c4ad26a9a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:12:31.662Z"
  - id: "SUGG-020"
    kind: "improvement-suggestion"
    description: "AC-17 requires harness boot, but the root justfile exposes no boot recipe for verifier execution."
    fp: "05f84c44dbd1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:15:17.488Z"
  - id: "DL-721"
    kind: "difficulty"
    description: "Independent just verify failed in the BL-013 Chromium terminal proof while waiting for the expected sentinel."
    fp: "58cdf4d49b23"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:21:37.871Z"
  - id: "DL-722"
    kind: "difficulty"
    description: "Verifier found BL-014 runtime evidence was summarized or assigned instead of measured."
    fp: "ee32a239c083"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:24:36.835Z"
  - id: "CONF-108"
    kind: "confusion"
    description: "The repository search workflow expected ripgrep, but the executable is unavailable in this environment."
    fp: "0390c054c807"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:27:21.100Z"
  - id: "CONF-109"
    kind: "confusion"
    description: "The documented Python command alias is unavailable, so repository edits must use python3 explicitly."
    fp: "115fdc0efb25"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:31:01.698Z"
  - id: "DL-723"
    kind: "difficulty"
    description: "A large source rewrite failed because shell quoting interpreted embedded terminal command strings."
    fp: "cf0113407364"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:35:35.796Z"
  - id: "DL-724"
    kind: "difficulty"
    description: "Focused BL-014 validation failed because legacy fixtures no longer matched the measured evidence schema."
    fp: "eece43e1fe12"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:39:37.531Z"
  - id: "DL-725"
    kind: "difficulty"
    description: "Focused evidence mutation validation exposed one negative fixture that the strict validator still accepted."
    fp: "ecf87d53146a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:44:25.918Z"
  - id: "DL-726"
    kind: "difficulty"
    description: "The designated BL-014 gate exposed a transient second terminal read after a visible proof consequence."
    fp: "494e82fc9ee7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:46:04.358Z"
  - id: "INS-143"
    kind: "insight"
    description: "Repeated designated runs showed the terminal readiness consequence did not preserve proof-input focus."
    fp: "2fe600cc3a0c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:52:21.764Z"
  - id: "INS-144"
    kind: "insight"
    description: "Measured terminal text proved readiness polls matched echoed command text instead of executed output consequence."
    fp: "643a26553510"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T07:54:49.346Z"
  - id: "DL-727"
    kind: "difficulty"
    description: "The full measured browser scenario completed, but its strict evidence join validator rejected the artifact."
    fp: "383113d26616"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T08:24:50.500Z"
  - id: "DL-728"
    kind: "difficulty"
    description: "Focused documentation validation exposed a stale phrase contract after the runbook rewrite."
    fp: "1b1efe338545"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T08:36:30.114Z"
  - id: "DL-729"
    kind: "difficulty"
    description: "Repeated BL-013 Chromium contention still timed out after the one-dispatch readiness change."
    fp: "c131c8d3b99d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T08:39:30.961Z"
  - id: "DL-730"
    kind: "difficulty"
    description: "Compact BL-013 proof still timed out during concurrent initial terminal execution and needs visible-text diagnosis."
    fp: "d9a53524f974"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T08:44:07.838Z"
  - id: "INS-145"
    kind: "insight"
    description: "Measured terminal text showed xterm visual wrapping split the completed BL013_DONE marker, so raw-text polling timed out after successful execution."
    fp: "d744b71bffa5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T08:47:51.377Z"
  - id: "DL-731"
    kind: "difficulty"
    description: "Full validation failed on four deterministic Prettier formatting findings after the terminal fix."
    fp: "0d0a3bb86a1f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T08:58:31.653Z"
  - id: "DL-732"
    kind: "difficulty"
    description: "Governed harness boot exceeded the 120-second initial wait without producing output."
    fp: "05c12f22e8aa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:09:14.478Z"
  - id: "DL-733"
    kind: "difficulty"
    description: "Governed harness boot remained silent after a second finite 120-second wait."
    fp: "0fab8d63c3be"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:11:38.931Z"
  - id: "CONF-110"
    kind: "confusion"
    description: "Evidence summary probe used a stale transition label key and required schema inspection."
    fp: "a00dbf5dfd03"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:14:58.200Z"
  - id: "INS-146"
    kind: "insight"
    description: "Transition summary assumed every Home row had a workflow join, but Home transitions intentionally omit workflowId."
    fp: "88647f9a332e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:16:33.167Z"
  - id: "INS-147"
    kind: "insight"
    description: "Observation catalog listing omitted the current session-buffer IDs, so handoff uses immediate capture receipts."
    fp: "057451d865d6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:20:14.734Z"
  - id: "DL-734"
    kind: "difficulty"
    description: "Shell quoting rejected a readability-only test edit containing nested literal apostrophes."
    fp: "36ecaf83a198"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:23:07.713Z"
  - id: "DL-735"
    kind: "difficulty"
    description: "Repository search attempted with rg, but the executable was unavailable; grep is required instead."
    fp: "d12f6dbd1047"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:32:34.538Z"
  - id: "DL-736"
    kind: "difficulty"
    description: "A jq join audit used the wrong scope and failed before the corrected root-variable query succeeded."
    fp: "10091ea0ff97"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:33:27.990Z"
  - id: "DL-737"
    kind: "difficulty"
    description: "Repository-wide grep encountered inaccessible generated paths while locating validator callers."
    fp: "4f143fb289d0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:40:20.510Z"
  - id: "DL-738"
    kind: "difficulty"
    description: "The environment exposed python3 but not the python alias needed by the edit pipeline."
    fp: "a4855fa7e2a3"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:43:02.316Z"
  - id: "DL-739"
    kind: "difficulty"
    description: "Focused schema v3 validation rejected the positive fixture and required join diagnosis."
    fp: "9ff6d078cbac"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:55:59.422Z"
  - id: "DL-740"
    kind: "difficulty"
    description: "Base evidence validation also rejected the upgraded positive fixture during staged diagnosis."
    fp: "36d3e699209d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:56:37.745Z"
  - id: "DL-741"
    kind: "difficulty"
    description: "The focused Chromium gate exposed a stale closing parenthesis after restricted evidence refactoring."
    fp: "4dd7641cf9d0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T09:59:36.734Z"
  - id: "DL-742"
    kind: "difficulty"
    description: "Chromium completed behavior but schema v3 rejected the generated joint evidence and required artifact diagnosis."
    fp: "1eb9c532317e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:02:02.336Z"
  - id: "DL-743"
    kind: "difficulty"
    description: "A new negative join fixture unexpectedly passed and required mutation-index diagnosis."
    fp: "059d26a5d558"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:07:29.986Z"
  - id: "DL-744"
    kind: "difficulty"
    description: "Shell quoting failed while removing temporary join diagnostics and required a safer edit."
    fp: "becc1d1233cb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:08:33.207Z"
  - id: "DL-745"
    kind: "difficulty"
    description: "Repository formatting validation found five edited TypeScript files requiring canonical formatting."
    fp: "54ed8e748f7b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:11:36.784Z"
  - id: "DL-746"
    kind: "difficulty"
    description: "Full validation exposed one unused join variable and two literal-key map type errors."
    fp: "3153ade0ac36"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:12:55.380Z"
  - id: "COORD-083"
    kind: "coordination"
    description: "Full verification and governed boot each required tool waits over 30 seconds before completion."
    fp: "cae67bfdb727"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:29:53.939Z"
  - id: "DL-747"
    kind: "difficulty"
    description: "The expected python executable was unavailable while resolving the work-item action plan, requiring a retry with an installed tool."
    fp: "819a6d3df2c6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:32:55.017Z"
  - id: "DL-748"
    kind: "difficulty"
    description: "Large diff and documentation reads required bounded range retries after tool truncation while completing the full branch review."
    fp: "ccc918ad9697"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:37:40.491Z"
  - id: "DL-749"
    kind: "difficulty"
    description: "The expected ripgrep executable was unavailable during the documentation stale-claim search, requiring a grep-based retry."
    fp: "b0dc250a23c1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:38:18.494Z"
  - id: "DL-750"
    kind: "difficulty"
    description: "The documentation inventory unexpectedly included hidden linked trees and exceeded output limits, requiring a repository-scope retry."
    fp: "d526a442818b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:38:18.791Z"
  - id: "WIN-051"
    kind: "win"
    description: "The designated BL-014 Chromium validation ran for more than thirty seconds while completing its one-worker zero-retry scenario and residual audit."
    fp: "4b68195c8e1c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:40:47.012Z"
  - id: "WIN-052"
    kind: "win"
    description: "The authoritative just verify run exceeded thirty seconds and completed successfully, but its large output required bounded result inspection."
    fp: "e245c65ba5d1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:47:54.767Z"
  - id: "WIN-053"
    kind: "win"
    description: "The governed harness boot validation ran for more than thirty seconds and returned ready within its declared 610000 ms bound."
    fp: "f7a1cc3a7937"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:55:31.448Z"
  - id: "DL-751"
    kind: "difficulty"
    description: "The global observation listing exceeded output limits at stage completion, so verifier evidence used the already captured session IDs instead."
    fp: "a4c7fa69dfb8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T10:59:56.095Z"
  - id: "DL-752"
    kind: "difficulty"
    description: "Repository search expected rg, but the environment does not provide the rg executable."
    fp: "f869de060177"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:41:40.520Z"
  - id: "DL-753"
    kind: "difficulty"
    description: "Large documentation files exceeded the view size limit and required targeted range reads."
    fp: "6efb7fdaea50"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:42:26.643Z"
  - id: "DL-754"
    kind: "difficulty"
    description: "Retained baseline JSON and broad timing search exceeded output limits, requiring bounded field extraction."
    fp: "decfc25f0810"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:44:47.052Z"
  - id: "DL-755"
    kind: "difficulty"
    description: "Repository-wide disposition and statistics searches exceeded output limits and required narrower scoped queries."
    fp: "084d5729c410"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:48:26.890Z"
  - id: "DL-756"
    kind: "difficulty"
    description: "The initial research diff inspection exceeded output limits and required narrower final-file validation."
    fp: "64ed51f198b4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:51:47.089Z"
  - id: "DL-757"
    kind: "difficulty"
    description: "The Issue #35 research brief exceeded the file viewer limit and required ranged reads."
    fp: "9d2f999146c4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:54:00.171Z"
  - id: "DL-758"
    kind: "difficulty"
    description: "The research brief used long lines, so initial ranged reads missed the remaining content and needed a narrower retry."
    fp: "82cb9d059a9e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:54:24.350Z"
  - id: "DL-759"
    kind: "difficulty"
    description: "The stable-routing runbook exceeded the file viewer limit and required bounded ranged reads."
    fp: "24574e9972df"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:56:22.125Z"
  - id: "CONF-111"
    kind: "confusion"
    description: "Concurrent observation captures returned the same DL-759 identifier for different descriptions, making evidence identity ambiguous."
    fp: "6b155650187c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:56:45.249Z"
  - id: "DL-760"
    kind: "difficulty"
    description: "The second stable-routing range started beyond the actual line count, requiring a final narrower read."
    fp: "9c39b3b39cd0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:57:22.492Z"
  - id: "DL-761"
    kind: "difficulty"
    description: "The repository statistics search exceeded the tool output limit and required a narrower source-only retry."
    fp: "7eac37b79d9e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T11:59:38.257Z"
  - id: "DL-762"
    kind: "difficulty"
    description: "The unfiltered observation inventory exceeded the tool output limit and required a current-session filter."
    fp: "23552e6b4fb4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:00:23.564Z"
  - id: "DL-763"
    kind: "difficulty"
    description: "The filtered harness observation listing emitted truncated JSON at 65,536 bytes, so session evidence required direct buffer inspection."
    fp: "0c925caeaefc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:06:13.335Z"
  - id: "DL-764"
    kind: "difficulty"
    description: "The python executable was unavailable while creating the BL-015 contract, requiring a retry with python3."
    fp: "f65b3525e32f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:14:04.845Z"
  - id: "DL-765"
    kind: "difficulty"
    description: "The shell safety filter rejected TypeScript template literals during test creation, requiring literal-free fixtures."
    fp: "b313214d7c15"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:16:26.723Z"
  - id: "DL-766"
    kind: "difficulty"
    description: "Nested quote handling broke the controller contract test creation command, requiring a quote-safe rewrite."
    fp: "fb62c3863842"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:21:17.594Z"
  - id: "DL-767"
    kind: "difficulty"
    description: "Focused BL-015 continuity validation failed and required diagnosis of cleanup fixtures and error precedence."
    fp: "94f2c57f28ac"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:23:41.507Z"
  - id: "DL-768"
    kind: "difficulty"
    description: "Nested replacement quotes broke the continuity fixture correction command, requiring line-oriented edits."
    fp: "54c658789ac6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:24:14.478Z"
  - id: "DL-769"
    kind: "difficulty"
    description: "A quoted ternary source assertion broke capacity test creation, requiring a simpler contract marker."
    fp: "5b6b79c5e175"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:27:10.230Z"
  - id: "DL-770"
    kind: "difficulty"
    description: "Nested import and JSON replacement quotes broke the capacity privacy patch command, requiring structured line edits."
    fp: "c89a66ea8032"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:30:06.889Z"
  - id: "DL-771"
    kind: "difficulty"
    description: "Focused BL-015 orchestration validation found an unterminated capacity evidence string requiring correction."
    fp: "c613287d0e8c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:32:04.766Z"
  - id: "DL-772"
    kind: "difficulty"
    description: "Markdown backticks triggered the shell safety filter during runbook creation, requiring a backtick-free write."
    fp: "ebd0871f90e5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:38:27.365Z"
  - id: "DL-773"
    kind: "difficulty"
    description: "Focused BL-015 documentation validation failed because formatted numeric bounds differed from raw constant strings."
    fp: "647b94b39115"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:40:49.537Z"
  - id: "DL-774"
    kind: "difficulty"
    description: "Focused BL-015 documentation validation found a case-sensitive disposition term mismatch requiring normalization."
    fp: "1c3558bf0a21"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:41:48.018Z"
  - id: "DL-775"
    kind: "difficulty"
    description: "Pre-measurement type checking found BL-015 capacity ownership and unused-import defects requiring correction."
    fp: "22ff7eb4615e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:43:30.509Z"
  - id: "DL-776"
    kind: "difficulty"
    description: "The second type check exposed synchronous library close semantics in capacity cleanup, requiring explicit try-catch."
    fp: "83e557234ecd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:44:50.337Z"
  - id: "DL-777"
    kind: "difficulty"
    description: "The unavailable Python executable interrupted a multi-replacement browser correction and required switching to Node."
    fp: "4bf45ad5e3b0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:47:49.013Z"
  - id: "DL-778"
    kind: "difficulty"
    description: "Shell quoting corrupted the browser replacement script, requiring smaller literal-safe edits instead."
    fp: "744bb62d7e3b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T12:48:35.927Z"
  - id: "INS-148"
    kind: "insight"
    description: "The designated serial BL-015 measurement required more than thirty seconds to complete all planned cohorts."
    fp: "8ee221b5d085"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:02:05.762Z"
  - id: "DL-779"
    kind: "difficulty"
    description: "The evidence validator rejected truthfully retained failed trace statuses as missing artifacts, contrary to the failure-retention contract."
    fp: "a04187dea528"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:03:48.066Z"
  - id: "DL-780"
    kind: "difficulty"
    description: "Public browser network evidence retained nested loopback authorities, requiring exact restricted transfer and public hashing."
    fp: "2b1e34cfde85"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:07:02.008Z"
  - id: "WIN-054"
    kind: "win"
    description: "Shell security correctly blocked documentation backticks from command substitution, requiring a literal-safe file update."
    fp: "ead28aac6033"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:10:56.199Z"
  - id: "DL-781"
    kind: "difficulty"
    description: "Observed-result documentation changed a tested no-target phrase tense and required exact contract alignment."
    fp: "7883c0bd9c80"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:12:33.096Z"
  - id: "DL-782"
    kind: "difficulty"
    description: "Formatting validation found all newly added BL-015 source, tests, and generated JSON needed repository-standard formatting."
    fp: "12877724ee08"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:13:50.923Z"
  - id: "DL-783"
    kind: "difficulty"
    description: "A multi-file whitespace-test edit hit shell literal quoting again, requiring simpler targeted substitutions."
    fp: "51e0c2cd0d3d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:16:27.540Z"
  - id: "DL-784"
    kind: "difficulty"
    description: "Full validation exposed a BL-011 acceptance test timeout under concurrent coverage load, requiring bounded timing stabilization."
    fp: "19c265c4da57"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:18:25.295Z"
  - id: "DL-785"
    kind: "difficulty"
    description: "Full validation passed tests but BL-015 orchestration branches reduced API coverage below the fixed 80 percent threshold."
    fp: "c0f14563b15c"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:20:29.304Z"
  - id: "DL-786"
    kind: "difficulty"
    description: "A prerequisite coverage test insertion failed from mixed quote construction and needed a simpler source replacement."
    fp: "f8d2f112204e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:21:29.748Z"
  - id: "DL-787"
    kind: "difficulty"
    description: "Designated prerequisite coverage improved branches to 79.91 percent but left two or more guard branches needed."
    fp: "b4c654c438aa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:22:53.109Z"
  - id: "DL-788"
    kind: "difficulty"
    description: "Guard negative tests raised branch coverage to 79.96 percent, leaving one additional covered decision needed."
    fp: "54d989e79ae0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:24:21.995Z"
  - id: "DL-789"
    kind: "difficulty"
    description: "Coverage validation uncovered a 20 ms deadline test whose guard acquisition race appeared only under concurrent suite load."
    fp: "d4aef7c9cc44"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:29:22.751Z"
  - id: "INS-149"
    kind: "insight"
    description: "The authoritative full validation required more than thirty seconds while completing all regression and browser gates."
    fp: "c3f68b8c4e29"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:38:00.225Z"
  - id: "INS-150"
    kind: "insight"
    description: "The requested governed harness boot required 407457 ms to prove both application boundaries and clean shutdown."
    fp: "c3224c38e895"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:45:45.597Z"
  - id: "DL-790"
    kind: "difficulty"
    description: "Post-notes full validation hit a BL-001 terminal evidence readiness timeout under ten-worker Playwright contention."
    fp: "7d5c98a0d412"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T13:51:34.592Z"
  - id: "DL-791"
    kind: "difficulty"
    description: "Workspace-relative test cleanup left generated continuity fixtures staged, requiring repository-root cleanup ownership."
    fp: "95ce4e696dbf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:02:53.972Z"
  - id: "DL-792"
    kind: "difficulty"
    description: "Full validation later hit a BL-013 terminal readiness timeout despite earlier passing runs, indicating repeated-suite host contention."
    fp: "d275596c1d9e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:09:12.506Z"
  - id: "INS-151"
    kind: "insight"
    description: "The widened BL-001 poll remained constrained by its declared phase budget, confirming host contention rather than a valid bound change."
    fp: "bf3797e33de2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:12:43.171Z"
  - id: "INS-152"
    kind: "insight"
    description: "A deliberate sixty-second host-load settling wait preceded the final bounded validation retry."
    fp: "d31c7d45d3a4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:14:15.299Z"
  - id: "DL-793"
    kind: "difficulty"
    description: "Large planning and documentation files required range-based reads after whole-file views were rejected."
    fp: "04c362f75378"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:26:15.896Z"
  - id: "DL-794"
    kind: "difficulty"
    description: "The repository environment lacks rg, so source structure inspection had to fall back to grep."
    fp: "833f3faad97e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:27:40.399Z"
  - id: "INS-153"
    kind: "insight"
    description: "Failed warm trace archives remained mode 0644 and contain trace data, violating the documented restricted-artifact policy."
    fp: "19a54b5eafbd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:29:00.798Z"
  - id: "DL-795"
    kind: "difficulty"
    description: "The documented python command was unavailable during protected trace scanning, requiring a python3 retry."
    fp: "21e5d3f6ec27"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:29:41.233Z"
  - id: "INS-154"
    kind: "insight"
    description: "Authoritative just verify exceeded thirty seconds while completing the full browser and residual gate suite."
    fp: "c95603421162"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:39:22.942Z"
  - id: "INS-155"
    kind: "insight"
    description: "The finite validator returned ok while world-readable trace archives contained protected authority and cookie patterns."
    fp: "c9c53277925b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:41:20.732Z"
  - id: "DL-796"
    kind: "difficulty"
    description: "Reading the required action plan required a ranged retry because the file exceeded the viewer size limit."
    fp: "90da417c6109"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:44:25.387Z"
  - id: "DL-797"
    kind: "difficulty"
    description: "Repository inspection expected ripgrep, but the environment lacked rg and required a documented fallback search tool."
    fp: "f18b5f391527"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:46:56.482Z"
  - id: "DL-798"
    kind: "difficulty"
    description: "The expected apply_patch helper was unavailable, requiring a backtrack to direct scripted file edits."
    fp: "9031f0c0eb43"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:51:59.427Z"
  - id: "DL-799"
    kind: "difficulty"
    description: "The scripted edit fallback used the unavailable python alias and required retrying with the installed python3 executable."
    fp: "8bad12e0d082"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T14:52:47.504Z"
  - id: "DL-800"
    kind: "difficulty"
    description: "Focused BL-015 correction validation failed because fixtures and source-contract assertions had not yet been migrated to the new evidence contract."
    fp: "d284cf1c1a3b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:08:22.381Z"
  - id: "DL-801"
    kind: "difficulty"
    description: "Focused mutation validation failed because the rewritten independent validator emitted a broader statistics class than the retained omitted-failure expectation."
    fp: "a1bbaccc6f6f"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:12:28.560Z"
  - id: "DL-802"
    kind: "difficulty"
    description: "Focused mutation validation next exposed a stale comparability classification expectation after exact delta recomputation was added."
    fp: "38d716394d25"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:13:16.983Z"
  - id: "DL-803"
    kind: "difficulty"
    description: "Focused mutation validation exposed that the unsafe-disclosure fixture now violated host identity first and needed a non-host public leak."
    fp: "a33065c6710e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:14:19.176Z"
  - id: "DL-804"
    kind: "difficulty"
    description: "Root type-check validation failed on one stale writeFile import after the CLI moved all evidence writes to atomic helpers."
    fp: "1d5feee3d242"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:17:47.984Z"
  - id: "DL-805"
    kind: "difficulty"
    description: "Type-check validation found a malformed newline regular expression introduced while adding the gitignore artifact-path check."
    fp: "0016fde971f9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:22:00.212Z"
  - id: "DL-806"
    kind: "difficulty"
    description: "Repository format validation failed across the BL-015 edits and required applying the configured formatter before rerunning the root gate."
    fp: "258ce9d092d9"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:23:34.585Z"
  - id: "INS-156"
    kind: "insight"
    description: "The exact designated cold, warm, continuity, and capacity measurement exceeded the initial ten-minute tool wait while remaining inside its declared bound."
    fp: "361f517f9b3b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:35:07.859Z"
  - id: "DL-807"
    kind: "difficulty"
    description: "The explicit cold-warm section bound expired during the single designated attempt; partial attempt evidence was retained and the bound allocation requires correction before a new no-retry run."
    fp: "eeda51f72e68"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:39:12.693Z"
  - id: "DL-808"
    kind: "difficulty"
    description: "The interrupted measurement left exact warm runtime processes because process-group timeout termination bypassed browser-finalizer cleanup."
    fp: "a0a3815614df"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:40:09.139Z"
  - id: "CONF-112"
    kind: "confusion"
    description: "I incorrectly treated a positional run ID as a just recipe argument; the residual recipe exposes no parameterized interface."
    fp: "93b6b0743241"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:40:28.096Z"
  - id: "INS-157"
    kind: "insight"
    description: "Formatting scanned the retained interrupted run journal, revealing a late browser checkpoint race after the CLI had finalized partial evidence."
    fp: "6d16b6e7b556"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:42:22.458Z"
  - id: "DL-809"
    kind: "difficulty"
    description: "Adding the late-checkpoint regression required a retry because the formatted test no longer matched the scripted insertion anchor."
    fp: "9786e53de872"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:44:23.025Z"
  - id: "INS-158"
    kind: "insight"
    description: "The corrected exact designated rerun exceeded the initial ten-minute wait while continuing under its predeclared overall command deadline."
    fp: "d21b0bb64c6e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:55:51.309Z"
  - id: "DL-810"
    kind: "difficulty"
    description: "The corrected rerun again reached the cold-warm section deadline, so the remaining defect is runtime audit latency rather than the previously unbounded inner operation."
    fp: "386e561f78f0"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T15:59:59.678Z"
  - id: "INS-159"
    kind: "insight"
    description: "The trace-chunk designated measurement exceeded the initial ten-minute wait while proceeding through the bounded serial plan."
    fp: "f2dfb57085cc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:12:32.992Z"
  - id: "INS-160"
    kind: "insight"
    description: "Repeated cold-warm timeout diagnosis found that persistent runtime background monitors were incorrectly counted as transient resources, forcing a pre-start failure into an unbounded Home-link action."
    fp: "4b8aa4831341"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:16:58.783Z"
  - id: "INS-161"
    kind: "insight"
    description: "The warm-audit-corrected designated measurement exceeded ten minutes while continuing through its finite no-retry execution."
    fp: "26966c8d4bd8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:29:00.623Z"
  - id: "DL-811"
    kind: "difficulty"
    description: "The complete evidence validator rejected the new run for unsafe disclosure, requiring diagnosis before any evidence could be accepted."
    fp: "1c3f5016397d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:29:58.708Z"
  - id: "DL-812"
    kind: "difficulty"
    description: "Artifact validation failed after public safety passed because restricted manifest paths were resolved from the API workspace instead of the repository root."
    fp: "7b5afdeb07c7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:31:21.193Z"
  - id: "DL-813"
    kind: "difficulty"
    description: "Final evidence checks found two validator defects: residual selection used lexicographic run IDs, and a truthful continuity failure was conflated with cleanup leakage."
    fp: "b59a02f8aa43"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:46:15.589Z"
  - id: "DL-814"
    kind: "difficulty"
    description: "The complete designated measurement required more than thirty seconds to finish."
    fp: "478d31851281"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:58:30.509Z"
  - id: "CONF-113"
    kind: "confusion"
    description: "The final evidence validator reported a cold identity violation despite a zero-change summary."
    fp: "db5665ce61d8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:59:23.055Z"
  - id: "DL-815"
    kind: "difficulty"
    description: "The expected ripgrep search executable was unavailable in the implementation environment."
    fp: "96e6c0875b42"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T16:59:49.725Z"
  - id: "DL-816"
    kind: "difficulty"
    description: "Focused validation reached formatting and rejected unformatted generated measurement JSON."
    fp: "ee70da94f1c7"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T17:04:09.019Z"
  - id: "DL-817"
    kind: "difficulty"
    description: "The corrected complete measurement again required more than thirty seconds to complete."
    fp: "85a390e43ec4"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T17:12:54.160Z"
  - id: "DL-818"
    kind: "difficulty"
    description: "The direct continuity-controller reproduction required more than thirty seconds to finish."
    fp: "185ebbc19722"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T17:19:20.540Z"
  - id: "CONF-114"
    kind: "confusion"
    description: "The rerun evidence validator still found cold prewarming after boundary cleanup waiting."
    fp: "d1ca9d9757ed"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T17:19:20.892Z"
  - id: "DL-819"
    kind: "difficulty"
    description: "The final exact no-retry measurement required more than thirty seconds to complete."
    fp: "db996a282796"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T17:30:48.461Z"
  - id: "CONF-115"
    kind: "confusion"
    description: "Final validation found that repeated cold projects were live again at their next precheck."
    fp: "180d6c717b41"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T17:32:14.634Z"
  - id: "DL-820"
    kind: "difficulty"
    description: "Machine restart interrupted the designated BL-015 run after four cold attempts and requires durable recovery handling."
    fp: "3eab7a573ccb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T23:53:03.272Z"
  - id: "CONF-116"
    kind: "confusion"
    description: "The expected ripgrep binary was unavailable during recovery inspection, requiring a portable search fallback."
    fp: "3c58e5c52213"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T23:53:07.142Z"
  - id: "DL-821"
    kind: "difficulty"
    description: "The required apply_patch helper was unavailable, forcing use of the repository patch engine for surgical edits."
    fp: "5e1c478a613e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-13T23:58:04.791Z"
  - id: "CONF-117"
    kind: "confusion"
    description: "The BL-015 validator and residual recipes rejected explicit run arguments and required their documented latest-run selection."
    fp: "3aaabb19fccc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:10:53.845Z"
  - id: "DL-822"
    kind: "difficulty"
    description: "The full BL-015 focused suite exposed stale executable documentation assertions after recovery behavior changed."
    fp: "e6360d9e16aa"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:13:47.736Z"
  - id: "DL-823"
    kind: "difficulty"
    description: "Full just verify stopped at Prettier because newly retained BL-015 evidence and recovery edits were not normalized."
    fp: "11ff54570c8d"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:14:28.821Z"
  - id: "DL-824"
    kind: "difficulty"
    description: "The full test gate hit an intermittent BL-011 event-correlation timeout before reporting updated coverage."
    fp: "fec4b4871166"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:18:07.495Z"
  - id: "DL-825"
    kind: "difficulty"
    description: "The canonical full gate rejected three newly added BL-015 test fixtures until repository formatting was applied."
    fp: "e3b02e453ca6"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:30:19.684Z"
  - id: "DL-826"
    kind: "difficulty"
    description: "The canonical gate hit an intermittent BL-004 capacity deadline assertion at 291 ms against a 250 ms test wall-clock bound."
    fp: "2c6bcb6b3acb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:31:47.879Z"
  - id: "DL-827"
    kind: "difficulty"
    description: "The canonical gate hit a BL-013 designated E2E timeout because runtime B remained running instead of reaching failed within 30 seconds."
    fp: "de14ea4b34bd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:48:00.146Z"
  - id: "DL-828"
    kind: "difficulty"
    description: "The canonical gate hit a BL-012 real-process browser evidence step timeout at its fixed 5000 ms bound under full-suite load."
    fp: "f25b9eea0ce2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T00:56:45.660Z"
system:
  compound:
    bubble_action: all-save
---

# Retro - backlog through BL-015

Cross-session observations retained at the BL-015 post-coding seam.
