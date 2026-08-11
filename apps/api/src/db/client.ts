import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import * as schema from './schema.js'

export const DEFAULT_DATABASE_PATH = path.resolve(
  fileURLToPath(new URL('../../ascend.db', import.meta.url))
)

export type AscendDatabase = LibSQLDatabase<typeof schema>

export interface DatabaseResource {
  readonly databasePath: string
  readonly database: AscendDatabase
  close(): void
}

function normalizeLocalDatabasePath(databasePath: string): string {
  if (databasePath.length === 0) {
    throw new TypeError('databasePath must be a non-empty filesystem path')
  }
  return path.resolve(databasePath)
}

export function resolveApplicationDatabasePath(
  databaseUrl = process.env.ASCEND_DATABASE_URL
): string {
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    return DEFAULT_DATABASE_PATH
  }
  if (databaseUrl.startsWith('file:')) {
    const filePath = databaseUrl.slice(5)
    return filePath.startsWith('//')
      ? path.resolve(fileURLToPath(databaseUrl))
      : path.resolve(filePath)
  }
  return path.resolve(databaseUrl)
}

export function createDatabase(databasePath: string): DatabaseResource {
  const normalizedPath = normalizeLocalDatabasePath(databasePath)
  const client: Client = createClient({
    url: pathToFileURL(normalizedPath).href,
  })
  const database = drizzle(client, { schema })
  let closed = false

  return {
    databasePath: normalizedPath,
    database,
    close() {
      if (closed) return
      closed = true
      client.close()
    },
  }
}
