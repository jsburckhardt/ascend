import { createHash } from 'node:crypto'
import { lstat, readFile, readdir, readlink } from 'node:fs/promises'
import path from 'node:path'

export interface RecursiveManifestEntry {
  readonly path: string
  readonly kind: 'directory' | 'file' | 'symlink'
  readonly mode: number
  readonly size: string
  readonly mtimeNs: string
  readonly ctimeNs: string
  readonly bytesSha256: string | null
  readonly linkTarget: string | null
}

export interface RecursiveManifest {
  readonly root: string
  readonly entries: readonly RecursiveManifestEntry[]
}

export async function captureRecursiveManifest(
  root: string
): Promise<RecursiveManifest> {
  const entries: RecursiveManifestEntry[] = []
  const visit = async (directory: string): Promise<void> => {
    const children = await readdir(directory, { withFileTypes: true })
    children.sort((left, right) => left.name.localeCompare(right.name))
    for (const child of children) {
      const absolute = path.join(directory, child.name)
      const relative = path.relative(root, absolute)
      const metadata = await lstat(absolute, { bigint: true })
      const kind = child.isDirectory()
        ? 'directory'
        : child.isSymbolicLink()
          ? 'symlink'
          : 'file'
      entries.push({
        path: relative,
        kind,
        mode: Number(metadata.mode & 0o777n),
        size: String(metadata.size),
        mtimeNs: String(metadata.mtimeNs),
        ctimeNs: String(metadata.ctimeNs),
        bytesSha256:
          kind === 'file'
            ? createHash('sha256')
                .update(await readFile(absolute))
                .digest('hex')
            : null,
        linkTarget: kind === 'symlink' ? await readlink(absolute) : null,
      })
      if (kind === 'directory') await visit(absolute)
    }
  }
  await visit(root)
  return { root, entries }
}

export function recursiveManifestDifferenceCount(
  before: RecursiveManifest,
  after: RecursiveManifest
): number {
  const beforeRows = new Map(
    before.entries.map((entry) => [entry.path, JSON.stringify(entry)])
  )
  const afterRows = new Map(
    after.entries.map((entry) => [entry.path, JSON.stringify(entry)])
  )
  const paths = new Set([...beforeRows.keys(), ...afterRows.keys()])
  return [...paths].filter(
    (entryPath) => beforeRows.get(entryPath) !== afterRows.get(entryPath)
  ).length
}

export interface MatrixObservation {
  readonly name: string
  readonly actual: unknown
}

export interface MatrixExecution {
  readonly case: string
  readonly invocationCount: number
  readonly observations: readonly MatrixObservation[]
}

export function assertExecutableMatrixArtifact(
  artifact: unknown,
  expectedCases: readonly string[]
): asserts artifact is {
  readonly version: 2
  readonly executions: readonly MatrixExecution[]
} {
  if (artifact === null || typeof artifact !== 'object') {
    throw new Error('Matrix artifact must be an object')
  }
  const candidate = artifact as Record<string, unknown>
  if ('executedCases' in candidate || 'assertions' in candidate) {
    throw new Error('Assertion-only matrix keys are prohibited')
  }
  if (candidate.version !== 2 || !Array.isArray(candidate.executions)) {
    throw new Error('Matrix artifact must contain versioned executions')
  }
  const executions = candidate.executions as unknown[]
  const names: string[] = []
  for (const value of executions) {
    if (value === null || typeof value !== 'object') {
      throw new Error('Every matrix execution must be an object')
    }
    const execution = value as Record<string, unknown>
    if (
      typeof execution.case !== 'string' ||
      typeof execution.invocationCount !== 'number' ||
      execution.invocationCount < 1 ||
      !Array.isArray(execution.observations) ||
      execution.observations.length === 0
    ) {
      throw new Error(
        'Every matrix case requires an invocation and observations'
      )
    }
    for (const observation of execution.observations) {
      if (
        observation === null ||
        typeof observation !== 'object' ||
        typeof (observation as Record<string, unknown>).name !== 'string' ||
        !Object.hasOwn(observation, 'actual')
      ) {
        throw new Error(
          'Every execution observation requires a name and actual value'
        )
      }
    }
    names.push(execution.case)
  }
  if (new Set(names).size !== names.length) {
    throw new Error('Matrix execution names must be unique')
  }
  if (
    names.length !== expectedCases.length ||
    expectedCases.some((name) => !names.includes(name))
  ) {
    throw new Error('Matrix executions do not match the required case catalog')
  }
}
