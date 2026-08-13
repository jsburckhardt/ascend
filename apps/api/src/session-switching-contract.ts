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
  maximumMs: 90_000,
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
  'disposable-evidence-files',
] as const)
export const BL014_TRANSITION_ORDER = Object.freeze([
  'initial-open-B',
  'initial-home-B',
  'initial-open-C',
  'initial-home-C',
  'initial-open-A',
  'switch-home-A',
  'switch-open-B',
  'history-back-B',
  'history-forward-B',
  'switch-home-B',
  'switch-open-C',
  'switch-home-C',
  'switch-open-A',
  'revisit-home-A',
  'revisit-open-B',
  'revisit-home-B',
  'revisit-open-C',
  'direct-A',
  'reload-A',
  'fresh-B',
  'close-B',
  'probe-A',
  'probe-C',
  'reopen-B',
] as const)
export const BL014_WORKFLOW_EXPECTATIONS = Object.freeze([
  {
    id: 'initial-B',
    project: 'B',
    reconnection: false,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'initial-C',
    project: 'C',
    reconnection: false,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'initial-A',
    project: 'A',
    reconnection: false,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'open-B',
    project: 'B',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'history-forward-B',
    project: 'B',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'open-C',
    project: 'C',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'open-A',
    project: 'A',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'revisit-B',
    project: 'B',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'revisit-C',
    project: 'C',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'direct-A',
    project: 'A',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'reload-A',
    project: 'A',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'fresh-B',
    project: 'B',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'probe-C',
    project: 'C',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
  {
    id: 'reopen-B',
    project: 'B',
    reconnection: true,
    management: 1,
    extensionHost: 1,
  },
] as const)

export const digestSessionEvidence = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const object = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
const digest = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
const token = (value: unknown): value is string =>
  typeof value === 'string' && /^project-[a-f0-9]{16}$/u.test(value)
const executionId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
    value
  )
const positiveInteger = (value: unknown): boolean =>
  Number.isSafeInteger(value) && Number(value) > 0
const zeroInteger = (value: unknown): boolean =>
  Number.isSafeInteger(value) && Number(value) === 0
const unique = (values: unknown[]): boolean =>
  new Set(values).size === values.length
const eventCount = (
  events: Record<string, unknown>[],
  start: number,
  end: number,
  name: string
): number =>
  events.filter(
    (event) =>
      Number(event.ordinal) > start &&
      Number(event.ordinal) <= end &&
      event.event === name
  ).length

export function validateSessionSwitchingEvidence(value: unknown): boolean {
  const evidence = object(value)
  if (
    evidence?.schemaVersion !== 2 ||
    evidence.executed !== true ||
    evidence.provenance !== 'playwright-observation'
  )
    return false
  const execution = object(evidence.execution)
  if (
    !executionId(execution?.id) ||
    execution?.clock !== 'process.hrtime.bigint' ||
    !positiveInteger(execution.startedNs) ||
    !positiveInteger(execution.finishedNs) ||
    Number(execution.finishedNs) <= Number(execution.startedNs)
  )
    return false
  const rootExecutionId = execution.id
  if (!Array.isArray(evidence.events) || evidence.events.length === 0)
    return false
  const events = evidence.events.map(object)
  if (events.some((event) => event === undefined)) return false
  const eventRows = events as Record<string, unknown>[]
  if (
    !unique(eventRows.map((event) => event.eventId)) ||
    eventRows.some(
      (event, index) =>
        !executionId(event.eventId) ||
        event.executionId !== rootExecutionId ||
        event.measured !== true ||
        event.ordinal !== index + 1 ||
        !positiveInteger(event.observedNs) ||
        typeof event.event !== 'string'
    )
  )
    return false
  if (
    !Array.isArray(evidence.observations) ||
    evidence.observations.length < BL014_TRANSITION_ORDER.length * 2
  )
    return false
  const observations = evidence.observations.map(object)
  if (observations.some((row) => row === undefined)) return false
  const observationRows = observations as Record<string, unknown>[]
  if (
    !unique(observationRows.map((row) => row.observationId)) ||
    observationRows.some(
      (row) =>
        !executionId(row.observationId) ||
        row.executionId !== rootExecutionId ||
        row.measured !== true ||
        !positiveInteger(row.observedNs) ||
        !['Home', 'Workbench', 'Closed'].includes(String(row.surface)) ||
        typeof row.url !== 'string' ||
        typeof row.focus !== 'string'
    )
  )
    return false
  const observationsById = new Map(
    observationRows.map((row) => [row.observationId, row])
  )
  if (
    !Array.isArray(evidence.transitions) ||
    evidence.transitions.length !== BL014_TRANSITION_ORDER.length
  )
    return false
  const transitions = evidence.transitions.map(object)
  if (
    JSON.stringify(transitions.map((row) => row?.transitionId)) !==
    JSON.stringify(BL014_TRANSITION_ORDER)
  )
    return false
  for (const row of transitions) {
    if (
      !row ||
      row.executionId !== rootExecutionId ||
      row.measured !== true ||
      !executionId(row.beforeObservationId) ||
      !executionId(row.afterObservationId) ||
      !observationsById.has(row.beforeObservationId) ||
      !observationsById.has(row.afterObservationId)
    )
      return false
    const range = object(row.eventRange)
    const deltas = object(row.eventDeltas)
    if (
      !range ||
      !deltas ||
      !Number.isSafeInteger(range.beforeOrdinal) ||
      !Number.isSafeInteger(range.afterOrdinal) ||
      Number(range.beforeOrdinal) < 0 ||
      Number(range.afterOrdinal) < Number(range.beforeOrdinal) ||
      Number(range.afterOrdinal) > eventRows.length
    )
      return false
    const expected = {
      request: eventCount(
        eventRows,
        Number(range.beforeOrdinal),
        Number(range.afterOrdinal),
        'browser.navigation.request'
      ),
      start: eventCount(
        eventRows,
        Number(range.beforeOrdinal),
        Number(range.afterOrdinal),
        'runtime.start.requested'
      ),
      reuse: eventCount(
        eventRows,
        Number(range.beforeOrdinal),
        Number(range.afterOrdinal),
        'runtime.start.reused'
      ),
      stop: eventCount(
        eventRows,
        Number(range.beforeOrdinal),
        Number(range.afterOrdinal),
        'runtime.stop.invoked'
      ),
      shutdown: eventCount(
        eventRows,
        Number(range.beforeOrdinal),
        Number(range.afterOrdinal),
        'runtime.shutdown.invoked'
      ),
    }
    if (Object.entries(expected).some(([key, count]) => deltas[key] !== count))
      return false
    if (String(row.transitionId).includes('home-')) {
      if (expected.stop !== 0 || expected.shutdown !== 0) return false
      const home = object(row.home)
      if (
        !home ||
        !Array.isArray(home.cards) ||
        home.cards.length !== 3 ||
        JSON.stringify(home.cards.map((card) => object(card)?.project)) !==
          JSON.stringify(['A', 'B', 'C']) ||
        home.runtimeControlsPresent !== 0 ||
        home.focus !== 'heading:Ascend'
      )
        return false
    }
  }
  if (!Array.isArray(evidence.projects) || evidence.projects.length !== 3)
    return false
  const projects = evidence.projects.map(object)
  if (
    projects.some((row) => row === undefined) ||
    JSON.stringify(projects.map((row) => row?.key)) !==
      JSON.stringify(['A', 'B', 'C'])
  )
    return false
  const projectRows = projects as Record<string, unknown>[]
  if (
    !unique(projectRows.map((row) => row.projectToken)) ||
    !unique(projectRows.map((row) => row.identityDigest)) ||
    projectRows.some(
      (row) =>
        !token(row.projectToken) ||
        !executionId(row.initialExecutionId) ||
        !executionId(row.identityObservationId) ||
        !digest(row.identityDigest) ||
        !digest(row.explorerDigest) ||
        !digest(row.editorFileDigest) ||
        !digest(row.terminalDigest) ||
        !digest(row.gitDigest)
    )
  )
    return false
  for (const project of projectRows) {
    const starts = eventRows.filter(
      (event) =>
        event.event === 'runtime.start.succeeded' &&
        event.projectToken === project.projectToken
    )
    if (starts.length !== 1 || project.initialStartCount !== starts.length)
      return false
  }
  const projectTokenByKey = new Map(
    projectRows.map((row) => [row.key, row.projectToken])
  )
  if (
    !Array.isArray(evidence.stateObservations) ||
    evidence.stateObservations.length < 11
  )
    return false
  const stateRows = evidence.stateObservations.map(object)
  if (stateRows.some((row) => row === undefined)) return false
  const requiredStates = [
    'initial-A',
    'initial-B',
    'initial-C',
    'before-leave-A',
    'return-A',
    'revisit-B',
    'revisit-C',
    'fresh-B',
    'probe-A',
    'probe-C',
    'reopen-B',
  ]
  if (
    requiredStates.some(
      (label) => !stateRows.some((row) => row?.label === label)
    )
  )
    return false
  for (const row of stateRows) {
    if (
      !row ||
      !executionId(row.observationId) ||
      row.executionId !== rootExecutionId ||
      row.measured !== true ||
      projectTokenByKey.get(row.project) !== row.projectToken ||
      !digest(row.identityDigest) ||
      !digest(row.explorerDigest) ||
      !digest(row.editorFileDigest) ||
      !digest(row.editorSentinelDigest) ||
      !digest(row.terminalDigest) ||
      !digest(row.cwdDigest) ||
      !digest(row.gitRootDigest) ||
      !digest(row.branchDigest) ||
      !digest(row.statusDigest) ||
      !digest(row.gitSentinelDigest) ||
      !digest(row.terminalSentinelDigest) ||
      row.visible !== true ||
      !Array.isArray(row.negativeAssertions) ||
      row.negativeAssertions.length !== 12
    )
      return false
    if (
      row.negativeAssertions.some((entry) => {
        const assertion = object(entry)
        return (
          !assertion ||
          !executionId(assertion.observationId) ||
          assertion.measured !== true ||
          assertion.absent !== true ||
          assertion.matchCount !== 0 ||
          assertion.project === row.project
        )
      })
    )
      return false
  }
  if (!Array.isArray(evidence.awaySamples) || evidence.awaySamples.length !== 2)
    return false
  const away = evidence.awaySamples.map(object)
  if (
    away.some(
      (row) =>
        !row ||
        row.executionId !== rootExecutionId ||
        !executionId(row.observationId) ||
        row.measured !== true ||
        row.browserInteraction !== false ||
        row.pidLive !== true ||
        !digest(row.processIdentityDigest) ||
        !digest(row.commandDigest) ||
        !positiveInteger(row.sequence) ||
        row.sequence !== row.outputSequence
    )
  )
    return false
  if (
    away[0]?.processIdentityDigest !== away[1]?.processIdentityDigest ||
    Number(away[1]?.sequence) <= Number(away[0]?.sequence)
  )
    return false
  const counter = object(evidence.counter)
  if (
    !counter ||
    !executionId(counter.executionId) ||
    !positiveInteger(counter.visibleBeforeLeave) ||
    !positiveInteger(counter.visibleReturn) ||
    Number(counter.visibleReturn) <= Number(away[1]?.sequence) ||
    Number(away[0]?.sequence) <= Number(counter.visibleBeforeLeave) ||
    counter.pidLiveBeforeLeave !== true ||
    !digest(counter.processIdentityDigest)
  )
    return false
  const storage = object(evidence.freshStorage)
  const storageBefore = object(storage?.before)
  const storageAfter = object(storage?.after)
  if (
    !storage ||
    !executionId(storage.executionId) ||
    storage.measured !== true ||
    !storageBefore ||
    !storageAfter ||
    !positiveInteger(storageBefore.cookies) ||
    !positiveInteger(storageBefore.localStorage) ||
    !positiveInteger(storageBefore.sessionStorage) ||
    !positiveInteger(storageBefore.cacheStorage) ||
    !Number.isSafeInteger(storageBefore.serviceWorkers) ||
    Number(storageBefore.serviceWorkers) < 0 ||
    !zeroInteger(storageAfter.cookies) ||
    !zeroInteger(storageAfter.localStorage) ||
    !zeroInteger(storageAfter.sessionStorage) ||
    !zeroInteger(storageAfter.cacheStorage) ||
    !zeroInteger(storageAfter.serviceWorkers) ||
    storage.browserCacheCleared !== true
  )
    return false
  if (
    !Array.isArray(evidence.workflows) ||
    evidence.workflows.length !== BL014_WORKFLOW_EXPECTATIONS.length ||
    !Array.isArray(evidence.networkObservations) ||
    evidence.networkObservations.length === 0
  )
    return false
  const networkRows = evidence.networkObservations.map(object)
  if (
    networkRows.some(
      (row) =>
        !row ||
        !executionId(row.observationId) ||
        row.executionId !== rootExecutionId ||
        row.measured !== true ||
        !token(row.projectToken) ||
        !BL014_WORKFLOW_EXPECTATIONS.some(
          (workflow) => workflow.id === row.workflowId
        ) ||
        typeof row.stableUrl !== 'string' ||
        !String(row.stableUrl).startsWith('/projects/') ||
        !['http', 'Management', 'ExtensionHost'].includes(String(row.role)) ||
        row.stablePrefix !== true ||
        row.leakCount !== 0 ||
        !Array.isArray(row.leakClasses) ||
        row.leakClasses.length !== 0
    )
  )
    return false
  for (let index = 0; index < BL014_WORKFLOW_EXPECTATIONS.length; index += 1) {
    const expected = BL014_WORKFLOW_EXPECTATIONS[index]!
    const workflow = object(evidence.workflows[index])
    if (
      !workflow ||
      workflow.id !== expected.id ||
      workflow.project !== expected.project ||
      workflow.projectToken !== projectTokenByKey.get(expected.project) ||
      workflow.reconnection !== expected.reconnection ||
      workflow.management !== expected.management ||
      workflow.extensionHost !== expected.extensionHost ||
      workflow.unknown !== 0 ||
      !executionId(workflow.executionId) ||
      !executionId(workflow.transitionExecutionId)
    )
      return false
    const rows = networkRows.filter((row) => row?.workflowId === expected.id)
    if (
      rows.filter((row) => row?.role === 'Management').length !==
        expected.management ||
      rows.filter((row) => row?.role === 'ExtensionHost').length !==
        expected.extensionHost ||
      rows.some(
        (row) =>
          row?.projectToken !== workflow.projectToken ||
          row?.reconnection !== workflow.reconnection
      )
    )
      return false
  }
  const cleanup = object(evidence.cleanup)
  if (
    !cleanup ||
    cleanup.measured !== true ||
    cleanup.manifestEqual !== true ||
    !digest(cleanup.beforeManifestDigest) ||
    cleanup.beforeManifestDigest !== cleanup.afterManifestDigest ||
    cleanup.controlUnchanged !== true ||
    !Array.isArray(cleanup.resources) ||
    cleanup.resources.length !== BL014_RESOURCE_CLASSES.length ||
    !Array.isArray(cleanup.projects) ||
    cleanup.projects.length !== projectRows.length
  )
    return false
  if (
    cleanup.resources.some((entry, index) => {
      const row = object(entry)
      return (
        !row ||
        row.resourceClass !== BL014_RESOURCE_CLASSES[index] ||
        !executionId(row.beforeObservationId) ||
        !executionId(row.afterObservationId) ||
        row.measured !== true ||
        !positiveInteger(row.before) ||
        row.after !== 0 ||
        typeof row.method !== 'string' ||
        row.method.length < 8
      )
    })
  )
    return false
  if (
    cleanup.projects.some((entry) => {
      const row = object(entry)
      return (
        !row ||
        !token(row.projectToken) ||
        !projectRows.some(
          (project) => project.projectToken === row.projectToken
        ) ||
        !executionId(row.observationId) ||
        row.measured !== true ||
        !Array.isArray(row.resourceClasses) ||
        row.resourceClasses.length === 0 ||
        row.residuals !== 0
      )
    })
  )
    return false
  if (
    !Array.isArray(cleanup.disposableFiles) ||
    cleanup.disposableFiles.length !== 2 ||
    cleanup.disposableFiles.some((entry) => {
      const row = object(entry)
      return (
        !row ||
        !executionId(row.observationId) ||
        row.measured !== true ||
        row.absent !== true
      )
    })
  )
    return false
  return !/(?:localhost|https?:\/\/|wss?:\/\/|canonicalPath|internalUrl|reconnectionToken|assigned|constructed)/iu.test(
    JSON.stringify(evidence)
  )
}
