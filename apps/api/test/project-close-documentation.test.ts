import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLOSE_DIALOG_BODY } from '../../web/src/App.js'
import {
  CLOSE_FAILURE_MESSAGES,
  PROJECT_CLOSE_TIMEOUT_MS,
  PROJECT_LIST_TIMEOUT_MS,
} from '../../web/src/projects.js'
import {
  INVALID_PROJECT_ID,
  PROJECT_CLOSED_EVENT,
  PROJECT_CLOSE_FAILED,
  PROJECT_CLOSE_FAILED_EVENT,
  PROJECT_NOT_FOUND,
} from '../src/routes/projects.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

async function text(relative: string): Promise<string> {
  return readFile(path.join(REPOSITORY_ROOT, relative), 'utf8')
}

describe('BL-009 close documentation contract', () => {
  it('synchronizes API, persistence, redaction, and stopped scope', async () => {
    const files = await Promise.all(
      ['README.md', 'docs/README.md', 'apps/api/README.md'].map(text)
    )
    const combined = files.join(' ')
    for (const token of [
      'DELETE /api/projects/{id}',
      '200',
      '400',
      '404',
      '500',
      'closed',
      INVALID_PROJECT_ID,
      PROJECT_NOT_FOUND,
      PROJECT_CLOSE_FAILED,
      PROJECT_CLOSED_EVENT,
      PROJECT_CLOSE_FAILED_EVENT,
      'one explicit SQLite transaction',
      'roll back',
      'exactly eight concurrent',
      'one 200',
      'seven 404',
      'no project-filesystem API',
      'no migration',
      'stopped',
      'BL-020',
      'running or failed workbench close',
    ])
      expect(combined.toLowerCase()).toContain(token.toLowerCase())
  })

  it('synchronizes modal, focus, recovery, evidence, cleanup, and commands', async () => {
    const files = await Promise.all(
      [
        'README.md',
        'docs/README.md',
        'apps/web/README.md',
        '.harness/engineering-harness.md',
        'justfile',
      ].map(text)
    )
    const combined = files.join(' ')
    for (const token of [
      CLOSE_DIALOG_BODY,
      'Close <project name>?',
      'aria-modal',
      'Tab',
      'Shift+Tab',
      'Escape',
      'Cancel',
      'Confirm',
      'destructive',
      'next Close',
      'previous Close',
      'Ascend heading',
      'No registered projects',
      'same-ID Retry',
      'Refresh projects',
      'presence',
      'absence',
      'failed or invalid',
      'stale',
      'unmounted',
      PROJECT_CLOSE_TIMEOUT_MS.toLocaleString('en-US'),
      PROJECT_LIST_TIMEOUT_MS.toLocaleString('en-US'),
      'manifest-matrix.json',
      'close-fault-episode.json',
      'integrity',
      'process groups',
      'listeners',
      'sidecars',
      'just verify-close-project',
      'just verify-focused',
      'just verify',
      'non-persistent',
    ])
      expect(combined.toLowerCase()).toContain(token.toLowerCase())
    for (const message of Object.values(CLOSE_FAILURE_MESSAGES)) {
      expect(combined).toContain(message)
    }
    expect(files[4]!.match(/^verify-close-project:/gmu)).toHaveLength(1)
    expect(files[4]!.match(/^verify-focused /gmu)).toHaveLength(1)
  })
})
