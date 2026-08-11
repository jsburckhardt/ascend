import { access, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { DEFAULT_DATABASE_PATH } from '../src/db/client.js'

export const REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
)
export const DATABASE_TEST_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-005/databases'
)
export const SQLITE_SIDECAR_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const
export const recordedDatabasePaths = new Set<string>()

export class DatabaseTestPathRefusedError extends Error {
  readonly code = 'default-database-refused'

  constructor() {
    super('BL-005 tests refuse the developer/default database path')
    this.name = 'DatabaseTestPathRefusedError'
  }
}

export function assertDisposableDatabasePath(databasePath: string): string {
  const normalizedPath = path.resolve(databasePath)
  if (normalizedPath === path.resolve(DEFAULT_DATABASE_PATH)) {
    throw new DatabaseTestPathRefusedError()
  }
  const relative = path.relative(DATABASE_TEST_ROOT, normalizedPath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      'Database test path must be inside the BL-005 disposable root'
    )
  }
  return normalizedPath
}

export interface DatabaseTestContext {
  readonly databasePath: string
  readonly files: readonly string[]
  registerClose(close: () => void | Promise<void>): void
  cleanup(): Promise<void>
}

export async function allocateDatabaseTestContext(
  label = 'database'
): Promise<DatabaseTestContext> {
  const directory = path.join(DATABASE_TEST_ROOT, `${label}-${randomUUID()}`)
  const databasePath = assertDisposableDatabasePath(
    path.join(directory, 'ascend.db')
  )
  if (recordedDatabasePaths.has(databasePath)) {
    throw new Error('Database test path was allocated more than once')
  }
  recordedDatabasePaths.add(databasePath)
  await mkdir(directory, { recursive: true })

  const files = SQLITE_SIDECAR_SUFFIXES.map(
    (suffix) => `${databasePath}${suffix}`
  )
  const closeCallbacks: Array<() => void | Promise<void>> = []
  let cleaned = false

  return {
    databasePath,
    files,
    registerClose(close) {
      if (cleaned) throw new Error('Cannot register a resource after cleanup')
      closeCallbacks.push(close)
    },
    async cleanup() {
      if (cleaned) return
      cleaned = true
      for (const close of closeCallbacks.reverse()) await close()
      for (const file of files) await rm(file, { force: true })
      for (const file of files) {
        await access(file).then(
          () => {
            throw new Error(`Database cleanup left ${file}`)
          },
          () => undefined
        )
      }
    },
  }
}
