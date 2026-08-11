import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  parseProcessCalls,
  registeredAdapterTools,
  validateApsSource,
  validateLifecycleHostCall,
  validateLifecycleSerialization,
} from './aps-source-validator.js'

export const root = path.resolve(import.meta.dirname, '../..')
export const apsPath = '.github/agents/aps-v1.2.2.agent.md'
export const coordinatorPath = '.github/agents/rpiv.agent.md'
export const workerPaths = [
  '.github/agents/rpiv-research.agent.md',
  '.github/agents/rpiv-planner.agent.md',
  '.github/agents/rpiv-implementer.agent.md',
  '.github/agents/rpiv-verifier.agent.md',
] as const
export const targetPaths = [coordinatorPath, ...workerPaths] as const
export const allProfilePaths = [apsPath, ...targetPaths] as const
const adapterPath =
  '.github/skills/agnostic-prompt-standard/platforms/vscode-copilot/adaptor.md'
const adapterTools = registeredAdapterTools(
  readFileSync(path.join(root, adapterPath), 'utf8')
)

export const triggers = [
  'retry or backtrack',
  'tool wait over 30 seconds',
  'unexpectedly empty search',
  'ambiguous failure',
  'inferred-only runtime behavior',
  'eyeballed constraint',
  'hidden setup',
  'magic-wand reflex',
] as const
export const kinds = [
  'coordination',
  'confusion',
  'difficulty',
  'gift',
  'improvement-suggestion',
  'insight',
  'magic-wand',
  'win',
] as const
export const checkpoints = [
  'after-context',
  'after-primary-work',
  'after-validation',
  'stage-completion',
] as const

const expectedTools: Record<(typeof workerPaths)[number], string[]> = {
  '.github/agents/rpiv-research.agent.md': [
    'search/codebase',
    'search/fileSearch',
    'search/textSearch',
    'search/usages',
    'read/readFile',
    'read/problems',
    'web/fetch',
    'web/githubRepo',
    'execute/runInTerminal',
    'execute/getTerminalOutput',
    'edit/createDirectory',
    'edit/createFile',
    'todo',
  ],
  '.github/agents/rpiv-planner.agent.md': [
    'search/codebase',
    'search/fileSearch',
    'search/textSearch',
    'search/usages',
    'read/readFile',
    'read/problems',
    'edit/createDirectory',
    'edit/createFile',
    'edit/editFiles',
    'execute/runInTerminal',
    'todo',
  ],
  '.github/agents/rpiv-implementer.agent.md': [
    'search/codebase',
    'search/fileSearch',
    'search/textSearch',
    'search/changes',
    'read/readFile',
    'read/problems',
    'edit/createDirectory',
    'edit/createFile',
    'edit/editFiles',
    'execute/runInTerminal',
    'execute/getTerminalOutput',
    'execute/testFailure',
    'todo',
  ],
  '.github/agents/rpiv-verifier.agent.md': [
    'search/codebase',
    'search/fileSearch',
    'search/textSearch',
    'search/changes',
    'read/readFile',
    'execute/runInTerminal',
    'execute/getTerminalOutput',
    'edit/createDirectory',
    'edit/createFile',
  ],
}

export type MatrixRow = {
  rule: string
  target: string
  status: 'pass' | 'fail'
  evidence: string
}

type Check = { rule: string; ok: boolean; evidence: string }
const text = (relativePath: string): string =>
  readFileSync(path.join(root, relativePath), 'utf8')
const check = (rule: string, ok: boolean, evidence: string): Check => ({
  rule,
  ok,
  evidence,
})
const ordered = (source: string, tokens: readonly string[]): boolean => {
  let offset = -1
  return tokens.every((token) => {
    offset = source.indexOf(token, offset + 1)
    return offset >= 0
  })
}
const yamlList = (source: string, symbol: string): string[] => {
  const match = source.match(
    new RegExp(`^${symbol}: YAML<<\\n([\\s\\S]*?)^>>$`, 'm')
  )
  if (!match) return []
  return [...match[1].matchAll(/^\s*-\s+(.+)$/gm)].map((entry) =>
    entry[1].trim()
  )
}
const frontmatterTools = (source: string): string[] => {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  const tools =
    frontmatter.match(/^tools:\n([\s\S]*?)(?=^[a-z][\w-]*:|\Z)/m)?.[1] ?? ''
  return [...tools.matchAll(/^\s+-\s+(.+)$/gm)].map((entry) => entry[1].trim())
}
const inventory = (source: string): Check[] => {
  const sectionOrder = [
    '<instructions>',
    '<constants>',
    '<formats>',
    '<runtime>',
    '<triggers>',
    '<processes>',
    '<input>',
  ]
  const sourceLines = source.split('\n')
  const section = (open: string, close: string): string => {
    const start = sourceLines.indexOf(open)
    const end = sourceLines.indexOf(close, start + 1)
    return start >= 0 && end > start
      ? sourceLines.slice(start + 1, end).join('\n')
      : ''
  }
  const constantBlock = section('<constants>', '</constants>')
  const constantSymbols: string[] = []
  let insideDataBlock = false
  for (const line of constantBlock.split('\n')) {
    if (insideDataBlock) {
      if (line === '>>') insideDataBlock = false
      continue
    }
    const declaration = line.match(/^([A-Z][A-Z0-9_]+):/)
    if (declaration) constantSymbols.push(declaration[1])
    if (/^[A-Z][A-Z0-9_]+: (?:JSON|YAML|TEXT|CSV)<</.test(line))
      insideDataBlock = true
  }
  const runtimeBlock = section('<runtime>', '</runtime>')
  const symbols = [
    ...constantSymbols,
    ...[...runtimeBlock.matchAll(/^([A-Z][A-Z0-9_]+):/gm)].map(
      (entry) => entry[1]
    ),
  ]
  const instructionBlock =
    source.match(/<instructions>\n([\s\S]*?)\n<\/instructions>/)?.[1] ?? ''
  const instructions = instructionBlock.split('\n').filter(Boolean)
  const formatBlocks = [
    ...source.matchAll(/<format id="[^"]+"[\s\S]*?<\/format>/g),
  ].map((entry) => entry[0])
  const whereSorted = formatBlocks.every((format) => {
    const keys = [...format.matchAll(/^- <([A-Z0-9_]+)>/gm)].map(
      (entry) => entry[1]
    )
    return keys.join('|') === [...keys].sort().join('|')
  })
  const diagnostics = validateApsSource(source, adapterTools)
  const sourceRulePasses = (rule: string): boolean =>
    !diagnostics.some((diagnostic) => diagnostic.rule === rule)
  return [
    check(
      'APS_SECTION_ORDER',
      ordered(source, sectionOrder),
      'canonical APS section order'
    ),
    check(
      'APS_INSTRUCTION_DISCIPLINE',
      instructions.every((line) =>
        /^You (MUST|SHOULD|MAY)( NOT)?\b/.test(line)
      ),
      'instruction vocabulary and no blank directives'
    ),
    check(
      'APS_SYMBOLS',
      symbols.every((symbol) => /^[A-Z0-9_]{2,24}$/.test(symbol)) &&
        new Set(symbols).size === symbols.length,
      'unique 2-24 character symbols'
    ),
    check(
      'APS_STATEMENT_IDS',
      sourceRulePasses('APS_STATEMENT_IDS'),
      'every RUN/USE BacktickId is grammatical and resolves'
    ),
    check(
      'APS_RUN_ARGUMENTS',
      sourceRulePasses('APS_RUN_ARGUMENTS'),
      'every RUN maps declared type/name arguments one-for-one'
    ),
    check(
      'APS_TOOL_ALLOWLIST',
      sourceRulePasses('APS_TOOL_ALLOWLIST'),
      'every USE tool is adapter-registered and explicitly allowed'
    ),
    check(
      'APS_WHERE_ORDER',
      whereSorted && sourceRulePasses('APS_WHERE_ORDER'),
      'format WHERE and RUN/USE parameter keys are lexicographic'
    ),
    check(
      'APS_FRONTMATTER',
      /^---\nname: .+\ndescription: "[^\n]+"\ntools:\n/.test(source) &&
        /\nuser-invocable: (?:true|false)\ndisable-model-invocation: (?:true|false)\ntarget: vscode\n/.test(
          source
        ),
      'VS Code required and recommended frontmatter fields'
    ),
    check(
      'APS_NO_DEPRECATED',
      !/^infer:|^user-invokable:/m.test(source),
      'no deprecated frontmatter fields'
    ),
  ]
}

export const quotePosix = (value: string): string =>
  `'${value.replaceAll("'", `'"'"'`)}'`

export type CorrectionSeamFailureTrace = {
  seam: 'pre-coding' | 'post-coding'
  seamFailureSet: boolean
  nextStage: 'dispatch-implement' | 'dispatch-verify'
  nextStageExecuted: boolean
  returnFormat: string
  returnedDetails: string
}

const processBody = (source: string, id: string): string =>
  source.match(
    new RegExp(`<process id=\"${id}\"[^>]*>([\\s\\S]*?)<\\/process>`)
  )?.[1] ?? ''

const indentation = (line: string): number =>
  line.length - line.trimStart().length

const processSetsSeamFailure = (
  source: string,
  id: string,
  visited = new Set<string>()
): boolean => {
  if (visited.has(id)) return false
  visited.add(id)
  const body = processBody(source, id)
  if (/SET SEAM_FAILURE := \{/.test(body)) return true
  return parseProcessCalls(body)
    .filter((call) => call.kind === 'RUN')
    .some((call) => processSetsSeamFailure(source, call.id, visited))
}

const returnField = (statement: string, field: string): string =>
  statement.match(new RegExp(`${field}=([^,\\n]+)`))?.[1]?.trim() ?? ''

export const correctionSeamFailureTraces = (
  source: string
): CorrectionSeamFailureTrace[] => {
  const routerLines = processBody(source, 'rpiv-router').split('\n')
  const routeIndex = routerLines.findIndex((line) =>
    line.includes('RUN `route-verification-failure`')
  )
  const routerTail = routerLines.slice(routeIndex + 1)
  const seamGuardIndex = routerTail.findIndex(
    (line) =>
      line.trim() ===
      'IF PIPELINE_STATUS = "error" and SEAM_FAILURE is not empty:'
  )
  const pipelineReturn =
    seamGuardIndex === 0 &&
    indentation(routerTail[1] ?? '') > indentation(routerTail[0] ?? '')
      ? (routerTail[1]?.trim() ?? '')
      : ''
  const correctionLines = processBody(
    source,
    'route-verification-failure'
  ).split('\n')
  return (
    [
      ['pre-coding', 'dispatch-implement'],
      ['post-coding', 'dispatch-verify'],
    ] as const
  ).map(([seam, nextStage]) => {
    const seamIndex = correctionLines.findIndex((line) =>
      line.includes(`RUN ` + '`' + `run-${seam}` + '`')
    )
    const nextStageIndex = correctionLines.findIndex(
      (line, index) =>
        index > seamIndex && line.includes(`RUN ` + '`' + nextStage + '`')
    )
    const failureGuardIndex = correctionLines.findIndex(
      (line, index) =>
        index > seamIndex &&
        index < nextStageIndex &&
        line.trim() === 'IF PIPELINE_STATUS = "error":'
    )
    const localReturnIndex = correctionLines.findIndex(
      (line, index) =>
        index > failureGuardIndex &&
        index < nextStageIndex &&
        line.trim() === 'RETURN: PIPELINE_STATUS'
    )
    const guardedReturn =
      seamIndex >= 0 &&
      nextStageIndex > seamIndex &&
      failureGuardIndex === seamIndex + 1 &&
      localReturnIndex === failureGuardIndex + 1 &&
      indentation(correctionLines[failureGuardIndex]) ===
        indentation(correctionLines[seamIndex]) &&
      indentation(correctionLines[localReturnIndex]) >
        indentation(correctionLines[failureGuardIndex]) &&
      indentation(correctionLines[nextStageIndex]) ===
        indentation(correctionLines[seamIndex])
    return {
      seam,
      seamFailureSet: processSetsSeamFailure(source, `run-${seam}`),
      nextStage,
      nextStageExecuted: !guardedReturn,
      returnFormat: returnField(pipelineReturn, 'format').replaceAll('"', ''),
      returnedDetails: returnField(pipelineReturn, 'details'),
    }
  })
}

export const validateCorrectionSeamFailurePropagation = (source: string) => {
  const traces = correctionSeamFailureTraces(source)
  const seam = processBody(source, 'run-lifecycle-seam')
  const failureAssignments = [
    ...seam.matchAll(/SET SEAM_FAILURE := \{([^\n]+)\}/g),
  ].map((match) => match[1])
  const typedEvidence =
    failureAssignments.length > 0 &&
    failureAssignments.every((assignment) =>
      [
        'hook: SEAM_HOOK',
        'target_stage: SEAM_TARGET',
        'host_error:',
        'result: HARNESS_RESULT',
      ].every((field) => assignment.includes(field))
    )
  const valid =
    typedEvidence &&
    traces.every(
      (trace) =>
        trace.seamFailureSet &&
        !trace.nextStageExecuted &&
        trace.returnFormat === 'PIPELINE_ERROR' &&
        trace.returnedDetails === 'SEAM_FAILURE'
    )
  return valid
    ? []
    : [
        {
          rule: 'CORRECTION_SEAM_FAILURE_PROPAGATION',
          line: 0,
          message:
            'Correction seam failure must stop before dispatch and return typed SEAM_FAILURE evidence',
        },
      ]
}
export const positiveMatrix = (): MatrixRow[] => {
  const rows: MatrixRow[] = []
  const add = (target: string, result: Check): void => {
    rows.push({
      rule: result.rule,
      target,
      status: result.ok ? 'pass' : 'fail',
      evidence: result.evidence,
    })
  }
  const aps = text(apsPath)
  const profileTargets = [...targetPaths]
  add(
    apsPath,
    check(
      'PROFILE_SINGLE_REUSABLE',
      (aps.match(/^RPIV_HARNESS_PROFILE:/gm) ?? []).length === 1,
      'one RPIV_HARNESS_PROFILE constant'
    )
  )
  add(
    apsPath,
    check(
      'PROFILE_TARGETS',
      profileTargets.every((target) => aps.includes(target)),
      'APS plus exact coordinator and four workers named'
    )
  )
  add(
    apsPath,
    check(
      'PROFILE_APPLICATION',
      aps.includes('creating, updating, or linting') &&
        aps.includes('apply-rpiv-profile') &&
        aps.includes('RPIV_HARNESS_PROFILE, RPIV_PROFILE_RESULT'),
      'create, update, and lint paths consume profile'
    )
  )
  add(
    apsPath,
    check(
      'PROFILE_FULL_LINT',
      [
        'host, front-door command shape',
        'worker no-hook boundary',
        'full APS syntax',
      ].every((value) => aps.includes(value)),
      'profile declares complete harness and APS inventory'
    )
  )
  inventory(aps).forEach((result) => add(apsPath, result))

  const coordinator = text(coordinatorPath)
  const router =
    coordinator.match(/<process id="rpiv-router"[\s\S]*?<\/process>/)?.[0] ?? ''
  const correction =
    coordinator.match(
      /<process id="route-verification-failure"[\s\S]*?<\/process>/
    )?.[0] ?? ''
  const seam =
    coordinator.match(
      /<process id="run-lifecycle-seam"[\s\S]*?<\/process>/
    )?.[0] ?? ''
  add(
    coordinatorPath,
    check(
      'LIFECYCLE_INITIAL_ORDER',
      ordered(router, [
        'prepare-feature-branch',
        'pre-flight',
        'dispatch-research',
        'dispatch-plan',
        'run-pre-coding',
        'dispatch-implement',
        'run-post-coding',
        'dispatch-verify',
        'run-post-flight',
      ]),
      'branch → four seams around RPIV stages'
    )
  )
  add(
    coordinatorPath,
    check(
      'LIFECYCLE_FRONT_DOOR',
      validateLifecycleHostCall(coordinator).length === 0 &&
        !coordinator.includes('USE `/eng-harness-flow') &&
        !/\bINVOKE\b|eng-harness-(?:boot|backpressure|retro)/.test(coordinator),
      'registered VS Code host tool invokes only eng-harness-flow with exact hook arguments'
    )
  )
  add(
    coordinatorPath,
    check(
      'LIFECYCLE_CORRECTION',
      ordered(correction, [
        'dispatch-plan',
        'IMPLEMENT_ATTEMPT := IMPLEMENT_ATTEMPT + 1',
        'run-pre-coding',
        'dispatch-implement',
        'run-post-coding',
        'dispatch-verify',
      ]),
      'Plan and Implement corrections repeat downstream seams'
    )
  )
  add(
    coordinatorPath,
    check(
      'CORRECTION_SEAM_FAILURE_PROPAGATION',
      validateCorrectionSeamFailurePropagation(coordinator).length === 0,
      'parsed correction flow stops before stage dispatch and returns typed seam evidence'
    )
  )
  add(
    coordinatorPath,
    check(
      'LIFECYCLE_IDENTITY_DEDUP',
      seam.includes('hook>|<target-stage>|<coordinator-stage-attempt>') &&
        seam.includes('SUCCESSFUL_SEAMS contains SEAM_ID'),
      'transition identity and success-only deduplication'
    )
  )
  add(
    coordinatorPath,
    check(
      'LIFECYCLE_SERIALIZATION',
      validateLifecycleSerialization(coordinator).length === 0,
      'active seam blocks overlap and clears only on explicit success or failure'
    )
  )
  add(
    coordinatorPath,
    check(
      'LIFECYCLE_FAILURE_GATING',
      [
        'host-unavailable',
        'skill-unavailable',
        'invocation-unavailable',
        'empty-result',
        'malformed-result',
        'non-success-result',
      ].every((value) => coordinator.includes(value)) &&
        (router.match(/IF PIPELINE_STATUS = "error":\n  RETURN/g)?.length ??
          0) >= 4,
      'all seam failures are explicit before dispatch'
    )
  )
  add(
    coordinatorPath,
    check(
      'COORDINATOR_TYPED_DISPATCH',
      [
        'RESEARCH_REQUEST',
        'PLAN_REQUEST',
        'IMPLEMENT_REQUEST',
        'VERIFY_REQUEST',
      ].every((request) => coordinator.includes(`args="${request}: Object"`)) &&
        (
          coordinator.match(
            /CAPTURE (?:RESEARCH|PLAN|IMPLEMENT|VERIFY)_RESULT from `agent\/runSubagent`/g
          ) ?? []
        ).length === 4,
      'one-for-one request args and captured worker results'
    )
  )
  inventory(coordinator).forEach((result) => add(coordinatorPath, result))

  for (const workerPath of workerPaths) {
    const worker = text(workerPath)
    add(
      workerPath,
      check(
        'WORKER_TRIGGER_PARITY',
        JSON.stringify(yamlList(worker, 'OBSERVATION_TRIGGERS')) ===
          JSON.stringify(triggers),
        'ordered eight-trigger contract'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_KIND_PARITY',
        JSON.stringify(yamlList(worker, 'OBSERVATION_KINDS')) ===
          JSON.stringify(kinds),
        'ordered eight-kind allowlist'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_REAL_OBSERVE',
        worker.includes(
          'USE `execute/runInTerminal` where: command="harness observe <OBSERVATION_LITERAL> --kind <OBSERVATION_KIND>"'
        ) && worker.includes('CAPTURE OBSERVATION_RESULT'),
        'real terminal command and captured result'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_LITERAL_SHELL',
        worker.includes(
          'wrap in single quotes and replace every embedded single quote'
        ) && worker.includes('OBSERVATION_INPUT_VALID'),
        'preflight validation and POSIX literal encoding'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_CHECKPOINTS',
        checkpoints.every((checkpoint) =>
          worker.includes(`OBSERVATION_CHECKPOINT := "${checkpoint}"`)
        ) && worker.includes('RUN `capture-pending-friction`'),
        'finite capture checkpoints through completion'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_RETRY_EVIDENCE',
        ['unavailable', 'empty', 'malformed', 'failed'].every((value) =>
          worker.includes(value)
        ) &&
          worker.includes('PENDING_OBSERVATIONS') &&
          worker.includes('status: "captured"'),
        'typed success/failure evidence retains pending events'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_TUPLE_DEDUP',
        worker.includes('match exact trigger, description, and kind tuple') &&
          worker.includes('remove only this exact successful tuple'),
        'successful tuple dedup with changed tuple independence'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_NO_LIFECYCLE',
        !worker.includes('/eng-harness-flow') &&
          !/USE `[^`]*--hook (?:pre-flight|pre-coding|post-coding|post-flight)/.test(
            worker
          ),
        'no executable lifecycle hook'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_LEAST_PRIVILEGE',
        JSON.stringify(frontmatterTools(worker)) ===
          JSON.stringify(expectedTools[workerPath]) &&
          !frontmatterTools(worker).some(
            (tool) => tool === 'agent' || tool === 'agent/runSubagent'
          ),
        'frontmatter tools unchanged and no dispatch'
      )
    )
    add(
      workerPath,
      check(
        'WORKER_TYPED_CONTRACT',
        /<input>\n[A-Z_]+_REQUEST: Object/.test(worker) &&
          /RETURN: format="[A-Z_]+"/.test(worker) &&
          worker.includes('observation_evidence=OBSERVATION_EVIDENCE'),
        'typed request, result format, and observation evidence'
      )
    )
    inventory(worker).forEach((result) => add(workerPath, result))
  }

  const docs = [
    'AGENTS.md',
    'CONTRIBUTING.md',
    'LLM.txt',
    '.harness/engineering-harness.md',
    'project/architecture/core-components/CORE-COMPONENT-260806-rpiv-stage-contract.md',
    'project/architecture/ADR/DECISION-LOG.md',
  ]
    .map(text)
    .join('\n')
  add(
    'documentation',
    check(
      'DOC_COORDINATOR_OWNERSHIP',
      docs.includes('coordinator') &&
        docs.includes('sole owner') &&
        docs.includes('harness observe'),
      'coordinator lifecycle and worker observation ownership documented'
    )
  )
  add(
    'documentation',
    check(
      'DOC_DECISIONS_49_52',
      [49, 50, 51, 52].every((id) => docs.includes(`| ${id} |`)),
      'decision records 49-52 present'
    )
  )
  const implementer = text(workerPaths[2])
  const verifier = text(workerPaths[3])
  const coordinatorCalls = parseProcessCalls(coordinator)
  const routerRuns = parseProcessCalls(router)
    .filter((call) => call.kind === 'RUN')
    .map((call) => call.id)
  const implementCalls = parseProcessCalls(implementer)
  const verifyCalls = parseProcessCalls(verifier)
  const commandValues = (calls: ReturnType<typeof parseProcessCalls>) =>
    calls
      .filter((call) => call.kind === 'USE')
      .map((call) => call.parameters.get('command') ?? '')

  add(
    'regression/issue-work-item',
    check(
      'RPIV_ISSUE_WORK_ITEM',
      commandValues(coordinatorCalls).some((command) =>
        command.includes(
          'gh issue view <ISSUE_NUMBER> --json title,body,labels'
        )
      ) &&
        coordinatorCalls.some(
          (call) =>
            call.id === 'search/fileSearch' &&
            call.parameters.get('pattern') ===
              '"project/work-items/<ISSUE_NUMBER>-*/**"'
        ) &&
        coordinator.includes('EXISTING_WORK_ITEM_COUNT > 1'),
      'executable issue parsing and unique issue-prefix work-item resolution'
    )
  )
  add(
    'regression/stage-order',
    check(
      'RPIV_STAGE_ORDER',
      ordered(routerRuns.join('|'), [
        'dispatch-research',
        'dispatch-plan',
        'dispatch-implement',
        'dispatch-verify',
      ]) &&
        [
          'RESEARCH_RESULT',
          'PLAN_RESULT',
          'IMPLEMENT_RESULT',
          'VERIFY_RESULT',
        ].every((result) =>
          coordinator.includes('CAPTURE ' + result + ' from')
        ),
      'parsed RUN order and captured typed stage handoffs'
    )
  )
  add(
    'regression/validation',
    check(
      'RPIV_VALIDATION_DELEGATION',
      commandValues(implementCalls).includes('"just verify-focused"') &&
        commandValues(implementCalls).includes('"just verify"') &&
        commandValues(verifyCalls).includes('"just verify"'),
      'Implement focused/full and Verify independent full validation remain executable'
    )
  )
  add(
    'regression/documentation',
    check(
      'RPIV_DOCUMENTATION_OWNERSHIP',
      implementer.includes('<process id="update-application-documentation"') &&
        verifier.includes('<process id="verify-application-documentation"') &&
        verifier.includes('SET FAILURE_OWNER := "implement"'),
      'Implement authors and Verify independently inspects documentation'
    )
  )
  add(
    'regression/commit-handoff',
    check(
      'RPIV_COMMIT_HANDOFF',
      implementCalls.some(
        (call) =>
          call.id === 'execute/runInTerminal' &&
          call.parameters.get('command') === 'COMMIT_COMMAND'
      ) &&
        commandValues(implementCalls).includes('"git rev-parse HEAD"') &&
        commandValues(implementCalls).includes('"git status --porcelain"') &&
        coordinator.includes(
          'require expected branch, non-empty commit SHA, clean tree'
        ),
      'implementation commit, SHA, and clean-tree handoff remain executable'
    )
  )
  add(
    'regression/verify-shipping',
    check(
      'RPIV_VERIFY_SHIPPING',
      [
        'gh auth status',
        'git push -u origin',
        'gh pr create',
        'gh issue edit',
      ].every((command) =>
        commandValues(verifyCalls).some((value) => value.includes(command))
      ),
      'Verify retains authentication, checkbox, push, and pull-request ownership'
    )
  )
  return rows.sort((left, right) =>
    `${left.rule}:${left.target}`.localeCompare(`${right.rule}:${right.target}`)
  )
}

export type Fixture = {
  expectedRule: string
  override?: Partial<FixtureModel>
  source?: string
}
type FixtureModel = {
  lifecycle: string[]
  implementCorrection: string[]
  planCorrection: string[]
  workerLifecycle: boolean
  toolsExpanded: boolean
  kinds: string[]
  observeCommand: string
  checkpoints: string[]
  dedupKey: string[]
  rejectBlank: boolean
  literalShell: boolean
  malformedIsSuccess: boolean
  retainFailures: boolean
  unavailableIsSuccess: boolean
  overlapDispatches: boolean
  hostChecks: boolean
  profileApplied: boolean
}
const baseline: FixtureModel = {
  lifecycle: ['pre-flight', 'pre-coding', 'post-coding', 'post-flight'],
  implementCorrection: ['pre-coding', 'implement', 'post-coding', 'verify'],
  planCorrection: ['plan', 'pre-coding', 'implement', 'post-coding', 'verify'],
  workerLifecycle: false,
  toolsExpanded: false,
  kinds: [...kinds],
  observeCommand: 'harness observe <POSIX_LITERAL> --kind <KIND>',
  checkpoints: [...checkpoints],
  dedupKey: ['trigger', 'description', 'kind', 'successful'],
  rejectBlank: true,
  literalShell: true,
  malformedIsSuccess: false,
  retainFailures: true,
  unavailableIsSuccess: false,
  overlapDispatches: false,
  hostChecks: true,
  profileApplied: true,
}
export const validateFixture = (fixture: Fixture): string[] => {
  if (fixture.source) {
    if (fixture.expectedRule === 'CORRECTION_SEAM_FAILURE_PROPAGATION')
      return validateCorrectionSeamFailurePropagation(fixture.source).map(
        (diagnostic) => diagnostic.rule
      )
    if (fixture.expectedRule === 'LIFECYCLE_HOST_PARAMETERS')
      return validateLifecycleHostCall(fixture.source).map(
        (diagnostic) => diagnostic.rule
      )
    if (fixture.expectedRule === 'LIFECYCLE_SERIALIZATION')
      return validateLifecycleSerialization(fixture.source).map(
        (diagnostic) => diagnostic.rule
      )
    return [
      ...new Set(
        validateApsSource(fixture.source, adapterTools, false).map(
          (diagnostic) => diagnostic.rule
        )
      ),
    ]
  }
  const value = { ...baseline, ...fixture.override }
  const failures: string[] = []
  if (JSON.stringify(value.lifecycle) !== JSON.stringify(baseline.lifecycle))
    failures.push('LIFECYCLE_ORDER')
  if (
    JSON.stringify(value.implementCorrection) !==
    JSON.stringify(baseline.implementCorrection)
  )
    failures.push('IMPLEMENT_CORRECTION')
  if (
    JSON.stringify(value.planCorrection) !==
    JSON.stringify(baseline.planCorrection)
  )
    failures.push('PLAN_CORRECTION')
  if (value.workerLifecycle) failures.push('WORKER_NO_LIFECYCLE')
  if (value.toolsExpanded) failures.push('WORKER_LEAST_PRIVILEGE')
  if (JSON.stringify(value.kinds) !== JSON.stringify(baseline.kinds))
    failures.push('WORKER_KIND_PARITY')
  if (value.observeCommand !== baseline.observeCommand)
    failures.push('WORKER_REAL_OBSERVE')
  if (!checkpoints.every((entry) => value.checkpoints.includes(entry)))
    failures.push('WORKER_CHECKPOINTS')
  if (JSON.stringify(value.dedupKey) !== JSON.stringify(baseline.dedupKey))
    failures.push('WORKER_TUPLE_DEDUP')
  if (!value.rejectBlank) failures.push('OBS_INPUT_REJECTION')
  if (!value.literalShell) failures.push('WORKER_LITERAL_SHELL')
  if (value.malformedIsSuccess) failures.push('OBS_MALFORMED_OUTPUT')
  if (!value.retainFailures) failures.push('WORKER_RETRY_EVIDENCE')
  if (value.unavailableIsSuccess) failures.push('LIFECYCLE_FAILURE_GATING')
  if (value.overlapDispatches) failures.push('LIFECYCLE_SERIALIZATION')
  if (!value.hostChecks) failures.push('LIFECYCLE_HOST_CHECKS')
  if (!value.profileApplied) failures.push('PROFILE_APPLICATION')
  return failures
}

export type SeamResult =
  | 'success'
  | 'host-unavailable'
  | 'skill-unavailable'
  | 'invocation-unavailable'
  | 'empty-result'
  | 'malformed-result'
  | 'non-success-result'

export class SeamSensor {
  private active = false
  private readonly successes = new Set<string>()
  calls = 0

  run(
    identity: string,
    result: SeamResult
  ): SeamResult | 'deduplicated' | 'overlap' {
    if (this.active) return 'overlap'
    if (this.successes.has(identity)) return 'deduplicated'
    this.active = true
    this.calls += 1
    this.active = false
    if (result === 'success') this.successes.add(identity)
    return result
  }

  canDispatch(identity: string): boolean {
    return this.successes.has(identity) && !this.active
  }

  isActive(): boolean {
    return this.active
  }

  begin(): void {
    this.active = true
  }
}

export const sha256 = (relativePath: string): string =>
  createHash('sha256').update(text(relativePath)).digest('hex')
