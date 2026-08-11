import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { API_START_FAILED_EVENT } from '../src/api-server.js'
import { PROJECT_LIBRARY_INITIALIZATION_FAILED } from '../src/app.js'
import {
  PROJECT_LIST_FAILED,
  PROJECT_LIST_FAILED_EVENT,
} from '../src/routes/projects.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

const repositoryText = (relativePath: string) =>
  readFile(path.join(REPOSITORY_ROOT, relativePath), 'utf8')

describe('BL-007 documentation contract', () => {
  it('synchronizes API lifecycle, list, Project Home, and scope contracts', async () => {
    const [root, application, api, web, harness] = await Promise.all([
      repositoryText('README.md'),
      repositoryText('docs/README.md'),
      repositoryText('apps/api/README.md'),
      repositoryText('apps/web/README.md'),
      repositoryText('.harness/engineering-harness.md'),
    ])
    const combined = [root, application, api, web, harness].join('\n')

    for (const token of [
      'ASCEND_DATABASE_URL',
      'before listening',
      'committed migrations',
      'complete stop',
      'repeated SIGINT',
      API_START_FAILED_EVENT,
      PROJECT_LIBRARY_INITIALIZATION_FAILED,
      'GET /api/projects',
      '{"projects":[]}',
      'id',
      'name',
      'canonicalPath',
      'createdAt',
      'createdAt ASC, id ASC',
      PROJECT_LIST_FAILED,
      PROJECT_LIST_FAILED_EVENT,
      '5,000 ms',
      'loading',
      'empty',
      'populated',
      'failure',
      'Retry',
      'newest-request-wins',
      'unmount',
      'whitespace-preserving',
      'keyboard-focusable',
      'opening is not available in BL-007',
      'BL-008+',
    ]) {
      expect(combined).toContain(token)
    }
    for (const stale of [
      'Current Fastify startup does not construct the project library',
      'Application startup integration remains deferred',
      'HTTP/API response semantics, routes, and UI remain BL-007 work',
      'BL-007/BL-008 own future HTTP, UI, listing',
    ]) {
      expect(combined).not.toContain(stale)
    }
  })

  it('documents root validation, controlled fault, isolation, cleanup, and evidence', async () => {
    const [application, api, web, harness, justfile, config, episode] =
      await Promise.all([
        repositoryText('docs/README.md'),
        repositoryText('apps/api/README.md'),
        repositoryText('apps/web/README.md'),
        repositoryText('.harness/engineering-harness.md'),
        repositoryText('justfile'),
        repositoryText('playwright.config.ts'),
        repositoryText('tests/e2e/project-home.spec.ts'),
      ])
    const combined = [application, api, web, harness].join('\n')
    for (const command of [
      'just verify-focused',
      'just test-e2e',
      'just verify',
    ]) {
      expect(combined).toContain(command)
    }
    for (const token of [
      'refuses the developer database',
      'test-launcher-only',
      '10,000 ms',
      'listener absence',
      '-wal',
      '-shm',
      '-journal',
      'test-results/bl-007/project-home/episode.json',
      'observed bounded result passed',
    ]) {
      expect(combined.toLowerCase()).toContain(token.toLowerCase())
    }
    expect(justfile).toMatch(/^verify-focused \*args:/mu)
    expect(justfile).toMatch(/^verify:/mu)
    expect(config).not.toContain('webServer:')
    expect(episode).toContain('ASCEND_E2E_API_TARGET')
    expect(episode).toContain('databaseArtifactsAbsent')
    expect(harness).toContain('Harness boot remains non-persistent')
  })
})
