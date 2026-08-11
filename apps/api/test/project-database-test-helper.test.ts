import { access, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_DATABASE_PATH } from '../src/db/client.js'
import {
  DATABASE_TEST_ROOT,
  DatabaseTestPathRefusedError,
  allocateDatabaseTestContext,
  assertDisposableDatabasePath,
  recordedDatabasePaths,
} from './project-database-test-helper.js'

async function optionalStat(file: string) {
  return stat(file).then(
    (value) => ({ size: value.size, mtimeMs: value.mtimeMs }),
    () => undefined
  )
}

describe('BL-005 database test isolation', () => {
  it('allocates unique contained recorded paths', async () => {
    const contexts = await Promise.all([
      allocateDatabaseTestContext('unique'),
      allocateDatabaseTestContext('unique'),
      allocateDatabaseTestContext('unique'),
    ])
    try {
      expect(
        new Set(contexts.map(({ databasePath }) => databasePath)).size
      ).toBe(3)
      for (const { databasePath } of contexts) {
        expect(path.relative(DATABASE_TEST_ROOT, databasePath)).not.toMatch(
          /^\.\./
        )
        expect(recordedDatabasePaths.has(databasePath)).toBe(true)
      }
    } finally {
      await Promise.all(contexts.map((context) => context.cleanup()))
    }
  })

  it('refuses the normalized default before mutation', async () => {
    const before = await optionalStat(DEFAULT_DATABASE_PATH)
    expect(() =>
      assertDisposableDatabasePath(DEFAULT_DATABASE_PATH)
    ).toThrowError(DatabaseTestPathRefusedError)
    expect(await optionalStat(DEFAULT_DATABASE_PATH)).toEqual(before)
  })

  it('closes first and removes only the database sidecar allowlist', async () => {
    const context = await allocateDatabaseTestContext('cleanup')
    const sibling = path.join(
      path.dirname(context.databasePath),
      'sibling.keep'
    )
    const trace: string[] = []
    await Promise.all([
      ...context.files.map((file) => writeFile(file, 'selected')),
      writeFile(sibling, 'keep'),
    ])
    context.registerClose(() => trace.push('closed'))

    await context.cleanup()
    await context.cleanup()

    expect(trace).toEqual(['closed'])
    await expect(access(sibling)).resolves.toBeUndefined()
    for (const file of context.files)
      await expect(access(file)).rejects.toThrow()
    await rm(sibling)
  })

  it('rejects paths outside the disposable root', () => {
    expect(() =>
      assertDisposableDatabasePath(path.resolve('outside.db'))
    ).toThrow(/disposable root/)
    expect(vi.fn()).not.toHaveBeenCalled()
  })
})
