import { createHash } from 'node:crypto'
import os from 'node:os'

export const RUNTIME_STATES = ['starting', 'running', 'failed'] as const
export type RuntimeState = (typeof RUNTIME_STATES)[number]

export const PUBLIC_RUNTIME_STATES = Object.freeze([
  'Stopped',
  'Starting',
  'Running',
  'Failed',
] as const)
export type PublicRuntimeState = (typeof PUBLIC_RUNTIME_STATES)[number]

export interface RuntimeSnapshot {
  readonly projectId: string
  readonly state: RuntimeState
  readonly pid: number | null
  readonly processStartTime: string | null
  readonly internalUrl: string | null
  readonly port: number | null
  readonly canonicalPath: string
  readonly stableRoute: string
  readonly ownerToken: string
  readonly startedAt: number
  readonly elapsedMs: number
}

export const RUNTIME_FAILURE_CATEGORIES = [
  'unknown-project',
  'canonical-path-invariant',
  'spawn-error',
  'executable-missing',
  'early-exit-code',
  'early-exit-signal',
  'address-in-use-exhausted',
  'readiness-timeout',
  'health-status-unexpected',
  'health-body-unexpected',
  'caller-cancelled',
  'manager-shutdown',
] as const
export type RuntimeFailureCategory = (typeof RUNTIME_FAILURE_CATEGORIES)[number]

export interface PublicRuntimeReport {
  readonly projectId: string
  readonly state: PublicRuntimeState
  readonly failureCategory?: RuntimeFailureCategory
}

export function publicRuntimeState(
  state: RuntimeState | 'registered' | undefined
): PublicRuntimeState {
  switch (state) {
    case undefined:
    case 'registered':
      return 'Stopped'
    case 'starting':
      return 'Starting'
    case 'running':
      return 'Running'
    case 'failed':
      return 'Failed'
  }
}

export const RUNTIME_FAILURE_MESSAGES: Readonly<
  Record<RuntimeFailureCategory, string>
> = Object.freeze({
  'unknown-project':
    'Project is not registered; refresh the project list and retry.',
  'canonical-path-invariant':
    'Project path no longer matches persisted metadata; register the project again.',
  'spawn-error':
    'Workbench could not start; retry after checking the host runtime.',
  'executable-missing':
    'Workbench executable is unavailable; install the configured code-server version.',
  'early-exit-code':
    'Workbench exited before readiness; correct its configuration and retry.',
  'early-exit-signal':
    'Workbench was signalled before readiness; check host capacity and retry.',
  'address-in-use-exhausted':
    'Loopback ports remained unavailable; release conflicting listeners and retry.',
  'readiness-timeout':
    'Workbench readiness timed out; check host capacity and retry.',
  'health-status-unexpected':
    'Workbench health returned an unexpected status; correct the installation and retry.',
  'health-body-unexpected':
    'Workbench health returned an unexpected body; correct the installation and retry.',
  'caller-cancelled': 'Workbench wait was cancelled; start again when ready.',
  'manager-shutdown':
    'Runtime manager is shutting down; restart Ascend before retrying.',
})

export interface RuntimeFailureDiagnostics {
  readonly attemptCount?: number
  readonly exitCode?: number
  readonly signal?: string
  readonly healthStatus?: number
  readonly timeoutMs?: number
  readonly port?: number
}

const DIAGNOSTIC_KEYS = new Set([
  'attemptCount',
  'exitCode',
  'signal',
  'healthStatus',
  'timeoutMs',
  'port',
])

export class RuntimeFailure extends Error {
  readonly category: RuntimeFailureCategory
  readonly diagnostics: Readonly<RuntimeFailureDiagnostics>

  constructor(
    category: RuntimeFailureCategory,
    diagnostics: RuntimeFailureDiagnostics = {}
  ) {
    super(RUNTIME_FAILURE_MESSAGES[category])
    this.name = 'RuntimeFailure'
    this.category = category
    const safeEntries = Object.entries(diagnostics).filter(
      ([key, value]) =>
        DIAGNOSTIC_KEYS.has(key) &&
        ((typeof value === 'number' && Number.isFinite(value)) ||
          (key === 'signal' &&
            typeof value === 'string' &&
            Object.hasOwn(os.constants.signals, value)))
    )
    delete this.stack
    this.diagnostics = Object.freeze(Object.fromEntries(safeEntries))
  }
}

export function stableProjectRoute(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/workbench/`
}

export function deriveProjectOwnerToken(projectId: string): string {
  return (
    'project-' +
    createHash('sha256').update(projectId).digest('hex').slice(0, 16)
  )
}

export interface RuntimeLifecycleEvent {
  readonly event:
    | 'runtime.start.requested'
    | 'runtime.start.succeeded'
    | 'runtime.start.failed'
    | 'runtime.health.changed'
  readonly projectId: string
  readonly from: 'stopped' | RuntimeState
  readonly to: RuntimeState
  readonly elapsedMs: number
  readonly classification?: RuntimeFailureCategory
}

const PUBLIC_STATE_BY_LIFECYCLE_EVENT: Readonly<
  Record<RuntimeLifecycleEvent['event'], PublicRuntimeState>
> = Object.freeze({
  'runtime.start.requested': 'Starting',
  'runtime.start.succeeded': 'Running',
  'runtime.start.failed': 'Failed',
  'runtime.health.changed': 'Failed',
})

export function publicRuntimeStateForLifecycleEvent(
  event: RuntimeLifecycleEvent['event'],
  to: RuntimeLifecycleEvent['to']
): PublicRuntimeState {
  const state = publicRuntimeState(to)
  if (PUBLIC_STATE_BY_LIFECYCLE_EVENT[event] !== state) {
    throw new Error('Runtime lifecycle event does not match its target state')
  }
  return state
}

export const PROJECT_RUNTIME_DEFAULTS = Object.freeze({
  executablePath: '/home/vscode/.local/bin/code-server',
  expectedUser: 'vscode',
  collisionAttempts: 3,
  healthPath: '/healthz/',
  healthStatus: 200,
  healthBodyStatuses: ['alive', 'expired'] as const,
  healthAttemptTimeoutMs: 1_000,
  readinessTimeoutMs: 15_000,
  pollIntervalMs: 50,
  gracefulShutdownMs: 2_000,
  forceShutdownMs: 2_000,
})

export interface ProjectRuntimeConfig {
  readonly executablePath: string
  readonly expectedUser: string
  readonly environment: Readonly<NodeJS.ProcessEnv>
  readonly collisionAttempts: number
  readonly healthAttemptTimeoutMs: number
  readonly readinessTimeoutMs: number
  readonly pollIntervalMs: number
  readonly gracefulShutdownMs: number
  readonly forceShutdownMs: number
}

export function createProjectRuntimeConfig(
  overrides: Partial<ProjectRuntimeConfig> = {}
): ProjectRuntimeConfig {
  const user = os.userInfo()
  const executablePath =
    overrides.executablePath ?? PROJECT_RUNTIME_DEFAULTS.executablePath
  const environment = Object.freeze(
    overrides.environment ?? {
      HOME: user.homedir,
      USER: user.username,
      LOGNAME: user.username,
      SHELL: user.shell || '/bin/bash',
      LANG: process.env.LANG ?? 'C.UTF-8',
      PATH:
        executablePath.slice(0, Math.max(0, executablePath.lastIndexOf('/'))) +
        ':/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      ...(process.env.XDG_RUNTIME_DIR === undefined
        ? {}
        : { XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR }),
    }
  )
  const config = {
    executablePath,
    expectedUser:
      overrides.expectedUser ?? PROJECT_RUNTIME_DEFAULTS.expectedUser,
    environment,
    collisionAttempts:
      overrides.collisionAttempts ?? PROJECT_RUNTIME_DEFAULTS.collisionAttempts,
    healthAttemptTimeoutMs:
      overrides.healthAttemptTimeoutMs ??
      PROJECT_RUNTIME_DEFAULTS.healthAttemptTimeoutMs,
    readinessTimeoutMs:
      overrides.readinessTimeoutMs ??
      PROJECT_RUNTIME_DEFAULTS.readinessTimeoutMs,
    pollIntervalMs:
      overrides.pollIntervalMs ?? PROJECT_RUNTIME_DEFAULTS.pollIntervalMs,
    gracefulShutdownMs:
      overrides.gracefulShutdownMs ??
      PROJECT_RUNTIME_DEFAULTS.gracefulShutdownMs,
    forceShutdownMs:
      overrides.forceShutdownMs ?? PROJECT_RUNTIME_DEFAULTS.forceShutdownMs,
  }
  for (const value of [
    config.collisionAttempts,
    config.healthAttemptTimeoutMs,
    config.readinessTimeoutMs,
    config.pollIntervalMs,
    config.gracefulShutdownMs,
    config.forceShutdownMs,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('Runtime bounds must be positive integers')
    }
  }
  return Object.freeze(config)
}

export interface RuntimeSafeLifecycleEvent {
  readonly event: RuntimeLifecycleEvent['event']
  readonly projectToken: string
  readonly from: RuntimeLifecycleEvent['from']
  readonly to: RuntimeLifecycleEvent['to']
  readonly elapsedMs: number
  readonly classification?: RuntimeFailureCategory
}

export function serializeRuntimeEvent(
  event: RuntimeLifecycleEvent
): RuntimeSafeLifecycleEvent {
  return Object.freeze({
    event: event.event,
    projectToken: deriveProjectOwnerToken(event.projectId),
    from: event.from,
    to: event.to,
    elapsedMs: Math.max(0, Math.floor(event.elapsedMs)),
    ...(event.classification === undefined
      ? {}
      : { classification: event.classification }),
  })
}
