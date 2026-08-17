import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  COMMITTED_EVIDENCE_WRITER_PATHS,
  SELECTED_CLOSE_SOURCE_PATHS,
  type CommittedEvidenceWriters,
  type SelectedCloseSources,
} from '../src/project-close-evidence.js'

const run = promisify(execFile)

export const REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
)

/** The merge base this change set is measured against by `G-16` and `G-23`. */
export async function resolveBaseSha(): Promise<string> {
  for (const reference of ['origin/main', 'main']) {
    try {
      const { stdout } = await run('git', ['merge-base', 'HEAD', reference], {
        cwd: REPOSITORY_ROOT,
      })
      const sha = stdout.trim()
      if (sha.length > 0) return sha
    } catch {
      continue
    }
  }
  throw new Error('BL-020 source guards cannot resolve a base revision')
}

async function readAll<Key extends string>(
  paths: Readonly<Record<Key, string>>
): Promise<Record<Key, string>> {
  const entries = await Promise.all(
    (Object.entries(paths) as [Key, string][]).map(
      async ([key, relative]) =>
        [
          key,
          await readFile(path.join(REPOSITORY_ROOT, relative), 'utf8'),
        ] as const
    )
  )
  return Object.fromEntries(entries) as Record<Key, string>
}

export async function readSelectedCloseSources(): Promise<SelectedCloseSources> {
  return readAll(SELECTED_CLOSE_SOURCE_PATHS)
}

export async function readCommittedEvidenceWriters(): Promise<CommittedEvidenceWriters> {
  return readAll(COMMITTED_EVIDENCE_WRITER_PATHS)
}

/**
 * Reads the base-SHA text of every selected source. A file that does not exist
 * at the base revision is omitted, which the differential guards treat as an
 * added file rather than as a silent pass.
 */
export async function readBaseCloseSources(
  sha: string
): Promise<Partial<SelectedCloseSources>> {
  const entries = await Promise.all(
    (
      Object.entries(SELECTED_CLOSE_SOURCE_PATHS) as [
        keyof SelectedCloseSources,
        string,
      ][]
    ).map(async ([key, relative]) => {
      try {
        const { stdout } = await run('git', ['show', sha + ':' + relative], {
          cwd: REPOSITORY_ROOT,
          maxBuffer: 64 * 1024 * 1024,
        })
        return [key, stdout] as const
      } catch {
        return [key, undefined] as const
      }
    })
  )
  return Object.fromEntries(
    entries.filter(
      (entry): entry is readonly [keyof SelectedCloseSources, string] =>
        entry[1] !== undefined
    )
  ) as Partial<SelectedCloseSources>
}

/**
 * Applies a negative control to one selected source. The anchor must be
 * present, so a renamed region fails loudly instead of skipping the control.
 */
export function mutateSource(
  sources: SelectedCloseSources,
  key: keyof SelectedCloseSources,
  from: string,
  to: string
): SelectedCloseSources {
  const original = sources[key]
  if (!original.includes(from)) {
    throw new Error(
      'BL-020 negative control anchor is missing from ' +
        SELECTED_CLOSE_SOURCE_PATHS[key] +
        ': ' +
        from
    )
  }
  return { ...sources, [key]: original.replace(from, to) }
}

/**
 * Applies a negative control to one committed evidence writer. An empty
 * `from` appends the control instead of replacing, so an injection control and
 * a replacement control share one shape; a non-empty anchor must be present.
 */
export function mutateWriter(
  writers: CommittedEvidenceWriters,
  key: keyof CommittedEvidenceWriters,
  from: string,
  to: string
): CommittedEvidenceWriters {
  const original = writers[key]
  if (from.length === 0)
    return { ...writers, [key]: original + '\n' + to + '\n' }
  if (!original.includes(from)) {
    throw new Error(
      'BL-020 writer control anchor is missing from ' +
        COMMITTED_EVIDENCE_WRITER_PATHS[key] +
        ': ' +
        from
    )
  }
  return { ...writers, [key]: original.replace(from, to) }
}
