import { randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  access,
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DatabaseTestContext } from './project-database-test-helper.js'

const REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
)
export const BL006_RESULT_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-006'
)
export const BL006_FIXTURE_ROOT = path.join(BL006_RESULT_ROOT, 'fixtures')
export const PERMISSION_CAPABILITY_PATH = path.join(
  BL006_RESULT_ROOT,
  'permission-capability.json'
)

export async function cleanupRegistrationDatabase(
  context: DatabaseTestContext
): Promise<void> {
  const directory = path.dirname(context.databasePath)
  await context.cleanup()
  await rm(directory, { recursive: true, force: true })
}

export type ManifestEntry = {
  relativePath: string
  type: 'directory' | 'file' | 'symlink' | 'other'
  mode: number
  mtimeNs: string
  bytesBase64?: string
  linkTargetBase64?: string
}

export interface RegistrationFixtureContext {
  readonly root: string
  readonly recordedPaths: readonly string[]
  recordMode(inputPath: string): Promise<void>
  cleanup(): Promise<void>
}

export async function allocateRegistrationFixture(
  label: string
): Promise<RegistrationFixtureContext> {
  const root = path.join(BL006_FIXTURE_ROOT, label + '-' + randomUUID())
  const relative = path.relative(BL006_FIXTURE_ROOT, root)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Fixture allocation escaped the BL-006 root')
  }
  await mkdir(root, { recursive: true })
  const recordedPaths: string[] = [root]
  const originalModes = new Map<string, number>()
  let cleaned = false
  return {
    root,
    recordedPaths,
    async recordMode(inputPath) {
      const details = await lstat(inputPath)
      originalModes.set(inputPath, details.mode & 0o7777)
      recordedPaths.push(inputPath)
    },
    async cleanup() {
      if (cleaned) return
      cleaned = true
      for (const [inputPath, mode] of originalModes) {
        await chmod(inputPath, mode).catch(() => undefined)
      }
      await rm(root, { recursive: true, force: true })
      await access(root).then(
        () => {
          throw new Error('BL-006 fixture cleanup left its allocated root')
        },
        () => undefined
      )
    },
  }
}

function nodeType(
  stats: Awaited<ReturnType<typeof lstat>>
): ManifestEntry['type'] {
  if (stats.isDirectory()) return 'directory'
  if (stats.isFile()) return 'file'
  if (stats.isSymbolicLink()) return 'symlink'
  return 'other'
}

export async function snapshotFixture(root: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = []
  async function visit(inputPath: string): Promise<void> {
    const stats = await lstat(inputPath, { bigint: true })
    const type = nodeType(stats as never)
    const relativePath = path.relative(root, inputPath) || '.'
    const entry: ManifestEntry = {
      relativePath,
      type,
      mode: Number(stats.mode & 0o7777n),
      mtimeNs: stats.mtimeNs.toString(),
    }
    if (type === 'file') {
      entry.bytesBase64 = (await readFile(inputPath)).toString('base64')
    } else if (type === 'symlink') {
      entry.linkTargetBase64 = Buffer.from(await readlink(inputPath)).toString(
        'base64'
      )
    }
    entries.push(entry)
    if (type === 'directory') {
      const children = (await readdir(inputPath)).sort()
      for (const child of children) await visit(path.join(inputPath, child))
    }
  }
  await visit(root)
  return entries.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  )
}

export type PermissionCapabilityArtifact = {
  status: 'proved' | 'skipped'
  probe: {
    accessDenied: boolean
    directoryReadDenied: boolean
    timedOut: boolean
    failedProbeResult: string
  }
  controlledDenial: {
    configuredRoot: 'invalid_opening_policy'
    project: 'path_unreadable'
  }
}

async function bounded<T>(operation: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('probe-timeout')), 1_000)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

export async function probePermissionCapability(
  context: RegistrationFixtureContext
): Promise<PermissionCapabilityArtifact> {
  const probe = path.join(context.root, 'permission-probe')
  await mkdir(probe)
  await context.recordMode(probe)
  const originalMode = (await lstat(probe)).mode & 0o7777
  let accessDenied = false
  let directoryReadDenied = false
  let timedOut = false
  try {
    await chmod(probe, 0)
    try {
      await bounded(access(probe, fsConstants.R_OK | fsConstants.X_OK))
    } catch (error) {
      accessDenied = true
      timedOut ||= error instanceof Error && error.message === 'probe-timeout'
    }
    try {
      await bounded(readdir(probe))
    } catch (error) {
      directoryReadDenied = true
      timedOut ||= error instanceof Error && error.message === 'probe-timeout'
    }
  } finally {
    await chmod(probe, originalMode)
  }
  const proved = accessDenied && directoryReadDenied && !timedOut
  const artifact: PermissionCapabilityArtifact = {
    status: proved ? 'proved' : 'skipped',
    probe: {
      accessDenied,
      directoryReadDenied,
      timedOut,
      failedProbeResult: proved
        ? 'none'
        : 'mode-000 did not deny both bounded readability operations',
    },
    controlledDenial: {
      configuredRoot: 'invalid_opening_policy',
      project: 'path_unreadable',
    },
  }
  await mkdir(BL006_RESULT_ROOT, { recursive: true })
  await writeFile(
    PERMISSION_CAPABILITY_PATH,
    JSON.stringify(artifact, null, 2) + '\n'
  )
  return artifact
}
