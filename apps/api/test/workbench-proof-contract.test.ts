import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BL001_FIXTURE,
  BL001_INJECTION_SENTINEL,
  CODE_SERVER_PATH,
  CODE_SERVER_VERSION,
  EXPLORER_SENTINEL,
  MARKDOWN_FIXTURE,
  MARKDOWN_RENDERED_SENTINEL,
  REPOSITORY_ROOT,
  canonicalFixturePath,
  snapshotFixture,
} from '../src/workbench-proof-contract.js'

describe('BL-001 proof contract', () => {
  it('defines the canonical metacharacter fixture and stable sentinels', async () => {
    const canonicalPath = await canonicalFixturePath()
    const snapshot = await snapshotFixture()

    expect(canonicalPath).toBe(BL001_FIXTURE)
    expect(canonicalPath).toContain(' ')
    expect(canonicalPath).toContain(';')
    expect(snapshot.paths).toEqual([
      EXPLORER_SENTINEL,
      'nested',
      path.join('nested', 'FIXTURE-MEMBERSHIP.txt'),
      MARKDOWN_FIXTURE,
    ])
    await expect(
      readFile(path.join(canonicalPath, MARKDOWN_FIXTURE), 'utf8')
    ).resolves.toContain(MARKDOWN_RENDERED_SENTINEL)
    await expect(access(BL001_INJECTION_SENTINEL)).rejects.toThrow()
    expect(Object.keys(snapshot.sentinelHashes).sort()).toEqual(
      [EXPLORER_SENTINEL, MARKDOWN_FIXTURE].sort()
    )
  })

  it('pins the deterministic designated-host executable in configuration and docs', async () => {
    const files = ['.devcontainer/devcontainer.json', 'docs/README.md']
    const contents = await Promise.all(
      files.map((file) => readFile(path.join(REPOSITORY_ROOT, file), 'utf8'))
    )

    expect(CODE_SERVER_PATH).toBe('/home/vscode/.local/bin/code-server')
    expect(CODE_SERVER_VERSION).toBe('4.131.0')
    for (const content of contents) {
      expect(content).toContain(CODE_SERVER_VERSION)
    }
  })
})
