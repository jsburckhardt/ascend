import { createHash } from 'node:crypto'
import { readdir, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))

export const REPOSITORY_ROOT = path.resolve(sourceDirectory, '../../..')
export const BL001_ROOT = path.join(REPOSITORY_ROOT, 'test-results/bl-001')
export const BL001_RUN_ROOT = path.join(BL001_ROOT, 'runs')
export const BL001_INJECTION_SENTINEL = path.join(
  BL001_ROOT,
  'injection-sentinel'
)
export const BL001_FIXTURE = path.join(
  REPOSITORY_ROOT,
  'tests/fixtures/bl-001/workbench project;BL-001'
)
export const EXPLORER_SENTINEL = 'EXPLORER-SENTINEL-BL-001.txt'
export const MARKDOWN_FIXTURE = 'WORKBENCH-PREVIEW.md'
export const MARKDOWN_RENDERED_SENTINEL =
  'BL-001 Markdown Preview Rendered Sentinel'
export const CODE_SERVER_PATH = '/home/vscode/.local/bin/code-server'
export const CODE_SERVER_VERSION = '4.131.0'
export const START_TIMEOUT_MS = 15_000
export const STOP_TIMEOUT_MS = 10_000
export const BROWSER_TIMEOUT_MS = 60_000
export const FULL_GATE_TIMEOUT_MS = 120_000
export const TERMINAL_COMMAND_TIMEOUT_MS = 5_000
export const TERMINAL_EPISODE_TIMEOUT_MS = 90_000
export const TERMINAL_PARITY_ROOT = path.join(BL001_ROOT, 'terminal-parity')
export const DIRECT_RAW_EVIDENCE = path.join(
  TERMINAL_PARITY_ROOT,
  'direct.raw.json'
)
export const INTEGRATED_RAW_EVIDENCE = path.join(
  TERMINAL_PARITY_ROOT,
  'integrated.raw.json'
)
export const TERMINAL_EPISODE_EVIDENCE = path.join(
  TERMINAL_PARITY_ROOT,
  'episode.json'
)

export type TerminalContext = 'direct' | 'integrated'

export interface TerminalCommandSpec {
  key: string
  executable: string
  args: string[]
  command: string
}

export const TERMINAL_IDENTITY_COMMANDS: readonly TerminalCommandSpec[] = [
  { key: 'hostname', executable: 'hostname', args: [], command: 'hostname' },
  { key: 'user', executable: 'id', args: ['-un'], command: 'id -un' },
  { key: 'cwd', executable: 'pwd', args: ['-P'], command: 'pwd -P' },
]

export const TERMINAL_TOOL_COMMANDS: readonly TerminalCommandSpec[] = [
  {
    key: 'git-version',
    executable: 'git',
    args: ['--version'],
    command: 'git --version',
  },
  {
    key: 'git-status',
    executable: 'git',
    args: ['status', '--short'],
    command: 'git status --short',
  },
  {
    key: 'gh-version',
    executable: 'gh',
    args: ['--version'],
    command: 'gh --version',
  },
  { key: 'tmux-version', executable: 'tmux', args: ['-V'], command: 'tmux -V' },
  {
    key: 'docker-version',
    executable: 'docker',
    args: ['--version'],
    command: 'docker --version',
  },
  {
    key: 'copilot-version',
    executable: 'copilot',
    args: ['--version'],
    command: 'copilot --version',
  },
]

export const TERMINAL_COMMANDS: readonly TerminalCommandSpec[] = [
  ...TERMINAL_IDENTITY_COMMANDS,
  ...TERMINAL_TOOL_COMMANDS,
]

export const TERMINAL_ENVIRONMENT_ALLOWLIST = ['PATH'] as const
export type PathClassification =
  'equal' | 'allowed difference' | 'unexplained failure-causing difference'

export interface ExecutableResolution {
  executable: string
  canonicalPath: string | null
}

export interface TerminalEnvironmentEvidence {
  variable: 'PATH'
  direct: string
  integrated: string
  classification: PathClassification
  directResolutions: ExecutableResolution[]
  integratedResolutions: ExecutableResolution[]
}

export const normalizeTerminalOutput = (content: string): string =>
  content.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

export const classifyPathEnvironment = (
  direct: string,
  integrated: string,
  directResolutions: readonly ExecutableResolution[],
  integratedResolutions: readonly ExecutableResolution[]
): PathClassification => {
  if (direct === integrated) return 'equal'
  const integratedByExecutable = new Map(
    integratedResolutions.map((entry) => [
      entry.executable,
      entry.canonicalPath,
    ])
  )
  const resolutionsEqual =
    directResolutions.length === integratedResolutions.length &&
    directResolutions.every(
      (entry) =>
        entry.canonicalPath !== null &&
        integratedByExecutable.get(entry.executable) === entry.canonicalPath
    )
  return resolutionsEqual
    ? 'allowed difference'
    : 'unexplained failure-causing difference'
}

export interface FixtureSnapshot {
  paths: string[]
  sentinelHashes: Record<string, string>
}

const listRelativePaths = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const paths: string[] = []

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const relativePath = entry.name
    paths.push(relativePath)
    if (entry.isDirectory()) {
      const children = await listRelativePaths(path.join(directory, entry.name))
      paths.push(...children.map((child) => path.join(relativePath, child)))
    }
  }

  return paths
}

const sha256 = (content: Buffer): string =>
  createHash('sha256').update(content).digest('hex')

export const canonicalFixturePath = async (): Promise<string> =>
  realpath(BL001_FIXTURE)

export const snapshotFixture = async (): Promise<FixtureSnapshot> => {
  const canonicalPath = await canonicalFixturePath()
  const sentinelPaths = [EXPLORER_SENTINEL, MARKDOWN_FIXTURE]
  const sentinelHashes = Object.fromEntries(
    await Promise.all(
      sentinelPaths.map(async (relativePath) => [
        relativePath,
        sha256(await readFile(path.join(canonicalPath, relativePath))),
      ])
    )
  )

  return {
    paths: await listRelativePaths(canonicalPath),
    sentinelHashes,
  }
}
