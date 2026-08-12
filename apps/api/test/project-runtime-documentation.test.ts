import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RUNTIME_FAILURE_CATEGORIES,
} from '../src/project-runtime-contract.js'

const root = path.resolve(import.meta.dirname, '../../..')

describe('project runtime documentation contract', () => {
  it('documents the executable interface bounds failures and ownership', async () => {
    const [document, episodeText, implementation] = await Promise.all([
      readFile(path.join(root, 'docs/project-runtime.md'), 'utf8'),
      readFile(
        path.join(
          root,
          'project/work-items/25-bl-010-start-and-reuse-one-project-workbench/implementation/evidence/episode.json'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'project/work-items/25-bl-010-start-and-reuse-one-project-workbench/implementation/00-implementation.md'
        ),
        'utf8'
      ),
    ])
    const episode = JSON.parse(episodeText) as {
      timing: { observedElapsedMs: number; targetMs: number }
    }
    for (const subject of [
      'ProjectRuntimeManager.start',
      'starting, running, or bounded failed',
      'memory-only',
      '/home/vscode/.local/bin/code-server',
      'non-root vscode',
      'direct argument-vector',
      '127.0.0.1',
      'at most three times',
      'GET /healthz/',
      '1,000 ms',
      '15,000 ms',
      'join one launch/readiness promise',
      'same PID identity and port',
      'Caller cancellation ends only that caller',
      'Every caller participating in one failed shared attempt receives the same typed failure object',
      'runtime.start.requested',
      'Raw canonical paths',
      '2,000 ms SIGKILL escalation',
      'graceful, escalated, or already-absent',
      'timing.observedElapsedMs',
      'zero residuals',
    ]) {
      expect(document).toContain(subject)
    }
    for (const category of RUNTIME_FAILURE_CATEGORIES) {
      expect(document).toContain(category)
    }
    expect(document).toContain(PROJECT_RUNTIME_DEFAULTS.healthPath)
    expect(episode.timing.targetMs).toBe(15_000)
    expect(episode.timing.observedElapsedMs).toBeGreaterThanOrEqual(0)
    expect(implementation).toContain('timing.observedElapsedMs')
  })

  it('names commands, every deferred boundary, and non-persistent harness boot', async () => {
    const [document, docsIndex, readme, harness, justfile] = await Promise.all([
      readFile(path.join(root, 'docs/project-runtime.md'), 'utf8'),
      readFile(path.join(root, 'docs/README.md'), 'utf8'),
      readFile(path.join(root, 'README.md'), 'utf8'),
      readFile(path.join(root, '.harness/engineering-harness.md'), 'utf8'),
      readFile(path.join(root, 'justfile'), 'utf8'),
    ])
    for (const command of [
      'just verify-project-runtime',
      'just proof-project-runtime',
      'just proof-project-runtime-residual-audit',
      'just verify-focused',
      'just verify',
    ]) {
      expect(document).toContain(command)
    }
    for (const deferred of [
      'stable route or proxy',
      'Project Home navigation or Open wiring',
      'multi-project coordination',
      'user Stop or Restart UI',
      'API-restart reconciliation',
      'persisted runtime handles or state',
      'auto-sleep',
      'scheduling',
      'containers',
    ]) {
      expect(document).toContain(deferred)
    }
    expect(docsIndex).toContain('project-runtime.md')
    expect(readme).toContain('Project Runtime Manager')
    expect(readme).not.toContain('880 ms')
    expect(document).not.toContain('880 ms')
    expect(harness).toContain('BL-010 project-runtime signal')
    expect(harness).toContain('Harness boot remains non-persistent')
    expect(justfile).toContain('verify-project-runtime:')
    expect(justfile).toContain('proof-project-runtime:')
    expect(justfile).toContain('proof-project-runtime-residual-audit:')
  })
})
