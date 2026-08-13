import { createHash } from 'node:crypto'

export const BL014_FIXTURES = Object.freeze([
  Object.freeze({
    key: 'A',
    id: 'bl014-a',
    name: 'Session fixture A',
    branch: 'session-a',
    fileName: 'A-SESSION.txt',
    editorSentinel: 'EDITOR_A_SESSION',
    dirtyFileName: 'a-away-counter.log',
    gitSentinel: 'git-session-a',
    terminalSentinel: 'TERMINAL_A_SESSION',
  }),
  Object.freeze({
    key: 'B',
    id: 'bl014-b',
    name: 'Session fixture B',
    branch: 'session-b',
    fileName: 'B-SESSION.txt',
    editorSentinel: 'EDITOR_B_SESSION',
    dirtyFileName: 'b-project-state.txt',
    gitSentinel: 'git-session-b',
    terminalSentinel: 'TERMINAL_B_SESSION',
  }),
  Object.freeze({
    key: 'C',
    id: 'bl014-c',
    name: 'Session fixture C',
    branch: 'session-c',
    fileName: 'C-SESSION.txt',
    editorSentinel: 'EDITOR_C_SESSION',
    dirtyFileName: 'c-project-state.txt',
    gitSentinel: 'git-session-c',
    terminalSentinel: 'TERMINAL_C_SESSION',
  }),
] as const)

export const BL014_COUNTER_CONTRACT = Object.freeze({
  cadenceMs: 250,
  maximumMs: 60_000,
  maximumAllowedMs: 90_000,
  sequencePattern: '^BL014_A_SEQUENCE=[0-9]+$',
  executable: 'tests/e2e/fixtures/bl014-counter.mjs',
})

export const BL014_INITIAL_START_ORDER = Object.freeze(['B', 'C', 'A'] as const)
export const BL014_OPEN_REENTRY_ORDER = Object.freeze([
  'B',
  'C',
  'A',
  'B',
  'C',
] as const)
export const BL014_RESOURCE_CLASSES = Object.freeze([
  'terminal-commands',
  'browser-contexts',
  'browser-pages',
  'proxy-operations',
  'runtime-groups',
  'listeners',
  'sockets',
  'web-service',
  'api-service',
  'database-files',
  'fixtures',
] as const)

export const digestSessionEvidence = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

const object = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const safeDigest = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)

const safeToken = (value: unknown): value is string =>
  typeof value === 'string' && /^project-[a-f0-9]{16}$/u.test(value)

export function validateSessionSwitchingEvidence(value: unknown): boolean {
  const evidence = object(value)
  if (evidence?.schemaVersion !== 1 || evidence.executed !== true) return false
  if (!Array.isArray(evidence.projects) || evidence.projects.length !== 3)
    return false
  const projects = evidence.projects.map(object)
  if (projects.some((project) => project === undefined)) return false
  const keys = projects.map((project) => project!.key)
  if (JSON.stringify(keys) !== JSON.stringify(['A', 'B', 'C'])) return false
  if (
    projects.some(
      (project) =>
        project!.initialStartCount !== 1 ||
        !safeToken(project!.projectToken) ||
        !safeDigest(project!.identityDigest) ||
        !safeDigest(project!.fileDigest) ||
        !safeDigest(project!.gitDigest) ||
        !safeDigest(project!.sentinelDigest)
    )
  )
    return false
  if (new Set(projects.map((project) => project!.identityDigest)).size !== 3)
    return false

  if (!Array.isArray(evidence.reentries) || evidence.reentries.length !== 5)
    return false
  const reentries = evidence.reentries.map(object)
  if (
    JSON.stringify(reentries.map((row) => row?.project)) !==
      JSON.stringify(BL014_OPEN_REENTRY_ORDER) ||
    reentries.some(
      (row) =>
        row?.executed !== true ||
        row.reused !== true ||
        row.startCount !== 0 ||
        row.stopCount !== 0 ||
        row.shutdownCount !== 0 ||
        typeof row.urlClass !== 'string' ||
        typeof row.focus !== 'string' ||
        !safeDigest(row.identityDigest)
    )
  )
    return false

  if (!Array.isArray(evidence.awaySamples) || evidence.awaySamples.length < 2)
    return false
  const samples = evidence.awaySamples.map(object)
  if (
    samples.some(
      (sample) =>
        sample?.executed !== true ||
        sample.browserInteraction === true ||
        !safeDigest(sample.pidDigest) ||
        !Number.isSafeInteger(sample.sequence)
    )
  )
    return false
  if (new Set(samples.map((sample) => sample!.pidDigest)).size !== 1)
    return false
  for (let index = 1; index < samples.length; index += 1)
    if (
      Number(samples[index]!.sequence) <= Number(samples[index - 1]!.sequence)
    )
      return false

  const lifecycle = object(evidence.lifecycle)
  if (
    lifecycle?.homeStopCount !== 0 ||
    lifecycle.closeCount !== 0 ||
    lifecycle.stopCount !== 0 ||
    lifecycle.restartCount !== 0 ||
    lifecycle.shutdownCount !== 0
  )
    return false
  const reconnection = object(evidence.reconnection)
  if (
    reconnection?.historyCount !== 1 ||
    reconnection.aReloadCount !== 1 ||
    reconnection.freshBContextCount !== 1 ||
    reconnection.bClientCloseCount !== 1 ||
    reconnection.bReopenCount !== 1 ||
    reconnection.storageCleared !== true ||
    reconnection.cacheCleared !== true ||
    reconnection.serviceWorkersCleared !== true ||
    reconnection.bClientCloseStopCount !== 0 ||
    !['restored', 'unsupported'].includes(
      String(reconnection.serverStateOutcome)
    ) ||
    !['restored', 'unsupported'].includes(
      String(reconnection.browserEditorOutcome)
    )
  )
    return false

  if (!Array.isArray(evidence.workflows) || evidence.workflows.length < 11)
    return false
  const tokenByProject = new Map(
    projects.map((project) => [project!.key, project!.projectToken])
  )
  if (
    evidence.workflows
      .map(object)
      .some(
        (workflow) =>
          workflow?.executed !== true ||
          !safeToken(workflow.projectToken) ||
          tokenByProject.get(workflow.project) !== workflow.projectToken ||
          workflow.management !== 1 ||
          !Number.isSafeInteger(workflow.extensionHost) ||
          Number(workflow.extensionHost) < 0 ||
          Number(workflow.extensionHost) > 1 ||
          workflow.unknown !== 0 ||
          workflow.stablePrefix !== true ||
          workflow.publicAuthorityLeaks !== 0
      )
  )
    return false

  if (
    evidence.workflows
      .slice(0, 3)
      .map(object)
      .some(
        (workflow) => workflow?.management !== 1 || workflow.extensionHost !== 1
      )
  )
    return false

  const cleanup = object(evidence.cleanup)
  if (
    cleanup?.measured !== true ||
    cleanup.manifestEqual !== true ||
    cleanup.controlUnchanged !== true ||
    !Array.isArray(cleanup.resources) ||
    cleanup.resources.length !== BL014_RESOURCE_CLASSES.length
  )
    return false
  const resources = cleanup.resources.map(object)
  if (
    resources.some(
      (resource, index) =>
        resource?.resourceClass !== BL014_RESOURCE_CLASSES[index] ||
        resource.measured !== true ||
        !Number.isSafeInteger(resource.before) ||
        Number(resource.before) <= 0 ||
        resource.after !== 0 ||
        typeof resource.method !== 'string' ||
        resource.method.length === 0
    )
  )
    return false

  return !/(?:127\.0\.0\.1|localhost|https?:\/\/|wss?:\/\/|canonicalPath|internalUrl|reconnectionToken)/iu.test(
    JSON.stringify(evidence)
  )
}
