import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createDatabase } from '../db/client.js'
import { migrateDatabase, type MigrationResult } from '../db/migrations.js'

export class DatabaseMigrationCommandError extends Error {
  readonly code: 'invalid-database-path' | 'migration-failed'

  constructor(
    code: DatabaseMigrationCommandError['code'],
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'DatabaseMigrationCommandError'
    this.code = code
  }
}

export async function migrateExplicitDatabasePath(
  databasePath: string | undefined
): Promise<MigrationResult> {
  if (databasePath === undefined || databasePath.trim().length === 0) {
    throw new DatabaseMigrationCommandError(
      'invalid-database-path',
      'An explicit database filesystem path is required'
    )
  }

  const normalizedPath = path.resolve(databasePath)
  await mkdir(path.dirname(normalizedPath), { recursive: true })
  const resource = createDatabase(normalizedPath)
  try {
    return await migrateDatabase(resource)
  } catch (error) {
    throw new DatabaseMigrationCommandError(
      'migration-failed',
      'Database migration failed',
      { cause: error }
    )
  } finally {
    resource.close()
  }
}

export async function runDatabaseMigrationCommand(
  args: readonly string[],
  write: (line: string) => void = console.log
): Promise<void> {
  if (args.length !== 1) {
    throw new DatabaseMigrationCommandError(
      'invalid-database-path',
      'Exactly one explicit database filesystem path is required'
    )
  }
  const result = await migrateExplicitDatabasePath(args[0])
  write(JSON.stringify(result))
}

const invokedPath = process.argv[1]
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(invokedPath)).href
) {
  runDatabaseMigrationCommand(process.argv.slice(2)).catch((error: unknown) => {
    const commandError =
      error instanceof DatabaseMigrationCommandError
        ? error
        : new DatabaseMigrationCommandError(
            'migration-failed',
            'Database migration failed',
            { cause: error }
          )
    console.error(
      JSON.stringify({
        error: commandError.code,
        message: commandError.message,
      })
    )
    process.exitCode = 1
  })
}
