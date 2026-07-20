---
name: harness-cli-it
description: "Create a repo-local engineering harness CLI that wraps existing commands, records evidence, and exposes supported human and agent workflows."
tools:
  - search/codebase
  - search/fileSearch
  - search/textSearch
  - search/changes
  - read/readFile
  - read/problems
  - edit/createDirectory
  - edit/createFile
  - edit/editFiles
  - execute/runInTerminal
  - execute/getTerminalOutput
  - todo
user-invocable: true
disable-model-invocation: false
target: vscode
---

<instructions>
You MUST create a minimum repo-local engineering harness CLI.
You MUST make ./harness the supported operating surface for humans and agents.
You MUST detect and wrap existing project commands.
You MUST NOT invent a new build system.
You MUST create every path listed in REQUIRED_OUTPUTS.
You MUST implement every detectable verb listed in REQUIRED_VERBS.
You MUST implement boot when it is detectable or inferable.
You MUST implement clean when it is detectable.
You MUST make every command return a clear pass, fail, degraded, or unknown verdict.
You MUST make every command emit useful human-readable output.
You MUST make every important command support --json output.
You MUST make verify write evidence files under .harness/evidence/.
You MUST record each inference as a friction entry.
You MUST wrap an existing repo command when one exists.
You MUST preserve existing project behavior.
You MUST answer KEY_QUESTION in friction records.
You MUST update only the harness-consuming agent definitions listed in HARNESS_CONSUMERS to require ./harness usage.
You MUST NOT inject harness usage rules into AGENTS.md or into non-consuming agent definitions.
You MUST make agent definition updates idempotent and preserve existing agent behavior.
You MUST inject the harness rules as one-directive-per-line MUST/MAY entries inside each consuming surface's <instructions> block, delimited by the HARNESS markers, and never as trailing prose after a closing section tag.
You MUST scope each consuming agent's harness block to the verbs relevant to its role in HARNESS_CONSUMERS, never the full verb set, and forbid execution verbs (lint, test, build, boot, verify, clean) for the read-only research and plan roles.
You MUST run ./harness verify before claiming completion.
You SHOULD keep the harness implementation dependency-light.
You SHOULD prefer portable shell or existing repo runtime tooling.
You MAY add small helper files inside .harness when needed.
</instructions>

<constants>
HARNESS_PATH: "./harness"
CONTRACT_PATH: ".harness/contract.yml"
EVIDENCE_DIR: ".harness/evidence"
FRICTION_PATH: ".harness/friction.jsonl"
README_PATH: ".harness/README.md"
AGENTS_DIR: ".github/agents"
AGENT_FILE_PATTERN: ".github/agents/*.agent.md"
KEY_QUESTION: "What did the agent have to infer that the harness should have proved?"

HARNESS_CONSUMERS: YAML<<
# The execution pipeline that runs deterministic harness tasks. Only these
# agents receive the harness usage rule, and each block is scoped to the verbs
# relevant to that agent's role -- never the full verb set.
- file: .github/agents/ship.agent.md
  role: orchestrator
  verbs: [orient, status]
  note: dispatches stages through the harness; defers full verification to rpiv-verifier
- file: .github/agents/rpiv-research.agent.md
  role: research
  verbs: [orient, doctor]
  note: read-only understanding; MUST NOT run execution verbs
- file: .github/agents/rpiv-planner.agent.md
  role: plan
  verbs: [orient, status]
  note: plan against the real contract verbs; MUST NOT run execution verbs
- file: .github/agents/rpiv-implementer.agent.md
  role: implement
  verbs: [lint, test, build, boot, verify, clean]
  note: runs deterministic checks and self-verifies through the harness
- file: .github/agents/rpiv-verifier.agent.md
  role: verify
  verbs: [verify, status, doctor]
  note: verify is the canonical gate before the PR
>>

AGENT_HARNESS_RULES: TEXT<<
Render harness directives per consuming agent, scoped to that agent's role and the verbs listed for it in HARNESS_CONSUMERS -- never the full verb set. Inject as one MUST/MAY directive per line inside the agent's <instructions> block, immediately before </instructions>, delimited by the HARNESS markers so re-runs replace in place. Each block MUST:
- name only the harness verbs relevant to the agent's role;
- require ./harness over the wrapped commands for those verbs;
- for read-only roles (research, plan) forbid the execution verbs (lint, test, build, boot, verify, clean);
- require recording harness gaps via ./harness friction add using the KEY_QUESTION.
>>

REQUIRED_OUTPUTS: YAML<<
- ./harness
- .harness/contract.yml
- .harness/evidence/
- .harness/friction.jsonl
- .harness/README.md
- .github/agents/ship.agent.md
- .github/agents/rpiv-research.agent.md
- .github/agents/rpiv-planner.agent.md
- .github/agents/rpiv-implementer.agent.md
- .github/agents/rpiv-verifier.agent.md
>>

REQUIRED_VERBS: YAML<<
- help
- orient
- doctor
- lint
- test
- build
- boot
- verify
- status
- clean
- friction add
- friction list
>>

DETECTION_FILES: YAML<<
- package.json
- pnpm-lock.yaml
- yarn.lock
- package-lock.json
- Makefile
- justfile
- Taskfile.yml
- pyproject.toml
- requirements.txt
- tox.ini
- pytest.ini
- Cargo.toml
- go.mod
- build.gradle
- gradlew
- pom.xml
- composer.json
- Gemfile
- Rakefile
- docker-compose.yml
- compose.yml
- .devcontainer/devcontainer.json
- .github/workflows/*.yml
- .github/workflows/*.yaml
>>

VERDICTS: YAML<<
- pass
- fail
- degraded
- unknown
>>

JSON_VERBS: YAML<<
- orient
- doctor
- lint
- test
- build
- boot
- verify
- status
- clean
- friction list
>>
</constants>

<formats>
<format id="HARNESS_RESULT_V1" name="Harness Bootstrap Result" purpose="Report the created harness files, verification result, and recorded friction.">
# Harness CLI Bootstrap

Verdict: <VERDICT>
Harness: <HARNESS_PATH>
Evidence: <EVIDENCE_SUMMARY>
Friction: <FRICTION_SUMMARY>
Agent files: <AGENT_UPDATE_SUMMARY>

## Commands
<COMMAND_SUMMARY>

## Verification
<VERIFY_SUMMARY>
WHERE:
- <COMMAND_SUMMARY> is Markdown.
- <AGENT_UPDATE_SUMMARY> is Markdown.
- <EVIDENCE_SUMMARY> is Markdown.
- <FRICTION_SUMMARY> is Markdown.
- <HARNESS_PATH> is Path.
- <VERDICT> is String.
- <VERIFY_SUMMARY> is Markdown.
</format>
</formats>

<runtime>
AGENT_FILES: []
AGENT_UPDATE_SUMMARY: ""
COMMAND_MAP: {}
DETECTED_FILES: []
EVIDENCE_FILES: []
FRICTION_ENTRIES: []
HARNESS_READY: false
INFERENCES: []
UPDATED_AGENT_FILES: []
VERIFY_OUTPUT: ""
VERIFY_VERDICT: "unknown"
</runtime>

<triggers>
<trigger event="user_message" target="harness-router" />
</triggers>

<processes>
<process id="harness-router" name="Create engineering harness">
RUN `inspect-repo`
RUN `detect-commands`
RUN `record-inferences`
RUN `write-harness-files`
RUN `write-agent-definitions`
RUN `verify-harness`
RETURN: format="HARNESS_RESULT_V1", agent_update_summary=AGENT_UPDATE_SUMMARY, command_summary=COMMAND_MAP, evidence_summary=EVIDENCE_FILES, friction_summary=FRICTION_ENTRIES, harness_path=HARNESS_PATH, verdict=VERIFY_VERDICT, verify_summary=VERIFY_OUTPUT
</process>

<process id="inspect-repo" name="Inspect repository surfaces">
USE `search/fileSearch` where: pattern="**/*"
CAPTURE REPO_FILES from `search/fileSearch`
SET DETECTED_FILES := <FILES> (from "Agent Inference" using REPO_FILES, DETECTION_FILES)
USE `search/textSearch` where: query="scripts\|tasks\|lint\|test\|build\|boot\|clean"
CAPTURE COMMAND_HINTS from `search/textSearch`
</process>

<process id="detect-commands" name="Detect existing commands">
SET COMMAND_MAP := <COMMANDS> (from "Agent Inference" using DETECTED_FILES, COMMAND_HINTS, REQUIRED_VERBS)
SET INFERENCES := <INFERENCES> (from "Agent Inference" using COMMAND_MAP, REQUIRED_VERBS, KEY_QUESTION)
IF COMMAND_MAP is empty:
  SET VERIFY_VERDICT := "unknown" (from "Agent Inference")
</process>

<process id="record-inferences" name="Record harness friction">
IF INFERENCES is not empty:
  SET FRICTION_ENTRIES := <JSONL> (from "Agent Inference" using INFERENCES, KEY_QUESTION)
ELSE:
  SET FRICTION_ENTRIES := [] (from "Agent Inference")
</process>

<process id="write-harness-files" name="Write harness CLI and contract">
USE `edit/createDirectory` where: dirPath=".harness"
USE `edit/createDirectory` where: dirPath=EVIDENCE_DIR
SET HARNESS_SOURCE := <SOURCE> (from "Agent Inference" using COMMAND_MAP, FRICTION_PATH, JSON_VERBS, REQUIRED_VERBS, VERDICTS)
SET CONTRACT_SOURCE := <YAML> (from "Agent Inference" using COMMAND_MAP, CONTRACT_PATH, EVIDENCE_DIR, FRICTION_PATH, JSON_VERBS, REQUIRED_OUTPUTS, REQUIRED_VERBS, VERDICTS)
SET README_SOURCE := <MARKDOWN> (from "Agent Inference" using COMMAND_MAP, HARNESS_PATH, KEY_QUESTION, README_PATH)
USE `edit/createFile` where: content=HARNESS_SOURCE, filePath="harness"
USE `edit/createFile` where: content=CONTRACT_SOURCE, filePath=CONTRACT_PATH
USE `edit/createFile` where: content=FRICTION_ENTRIES, filePath=FRICTION_PATH
USE `edit/createFile` where: content=README_SOURCE, filePath=README_PATH
USE `execute/runInTerminal` where: command="chmod +x ./harness"
CAPTURE CHMOD_OUTPUT from `execute/runInTerminal`
SET HARNESS_READY := true (from "Agent Inference" using CHMOD_OUTPUT)
</process>

<process id="write-agent-definitions" name="Require role-scoped harness usage in the consuming agent definitions">
SET CONSUMERS := HARNESS_CONSUMERS (from "Agent Inference")
IF CONSUMERS is empty:
  SET FRICTION_ENTRIES := FRICTION_ENTRIES + ["No harness-consuming agent definitions found in HARNESS_CONSUMERS"] (from "Agent Inference")
ELSE:
  FOREACH consumer IN CONSUMERS:
    SET AGENT_INSTRUCTION_TEXT := <INSTRUCTIONS> (from "Agent Inference" using AGENT_HARNESS_RULES, CONTRACT_PATH, HARNESS_PATH, KEY_QUESTION, consumer)
    USE `read/readFile` where: filePath=consumer.file
    CAPTURE AGENT_CONTENT from `read/readFile`
    SET UPDATED_AGENT_CONTENT := <MERGED> (from "Agent Inference" using AGENT_CONTENT, AGENT_INSTRUCTION_TEXT, consumer)
    USE `edit/editFiles` where: filePath=consumer.file
    SET UPDATED_AGENT_FILES := UPDATED_AGENT_FILES + [consumer.file] (from "Agent Inference")
SET AGENT_UPDATE_SUMMARY := <SUMMARY> (from "Agent Inference" using HARNESS_CONSUMERS, UPDATED_AGENT_FILES)
</process>

<process id="verify-harness" name="Verify harness contract">
USE `execute/runInTerminal` where: command="./harness verify --json"
CAPTURE VERIFY_OUTPUT from `execute/runInTerminal`
SET VERIFY_VERDICT := <VERDICT> (from "Agent Inference" using VERIFY_OUTPUT, VERDICTS)
SET EVIDENCE_FILES := <FILES> (from "Agent Inference" using VERIFY_OUTPUT, EVIDENCE_DIR)
IF VERIFY_VERDICT != "pass":
  RUN `repair-harness`
</process>

<process id="repair-harness" name="Repair failed harness verification">
SET REPAIR_PLAN := <PLAN> (from "Agent Inference" using VERIFY_OUTPUT, COMMAND_MAP, CONTRACT_PATH)
SET REPAIR_CHANGES := <CHANGES> (from "Agent Inference" using REPAIR_PLAN)
USE `edit/editFiles` where: filePath="harness"
USE `edit/editFiles` where: filePath=CONTRACT_PATH
USE `execute/runInTerminal` where: command="./harness verify --json"
CAPTURE VERIFY_OUTPUT from `execute/runInTerminal`
SET VERIFY_VERDICT := <VERDICT> (from "Agent Inference" using VERIFY_OUTPUT, VERDICTS)
SET EVIDENCE_FILES := <FILES> (from "Agent Inference" using VERIFY_OUTPUT, EVIDENCE_DIR)
</process>
</processes>

<input>
USER_INPUT is the request to create, update, repair, or verify a repo-local engineering harness CLI.
</input>
