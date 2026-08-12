import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { WORKBENCH_FAILURE_TABLE } from '../src/workbench-proxy-contract.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

const read = (filePath: string) =>
  readFile(path.join(REPOSITORY_ROOT, filePath), 'utf8')

describe('stable workbench routing documentation and command contract', () => {
  it('documents every behavior, bound, fault, disclosure, cleanup, and exclusion', async () => {
    const [runbook, root, api, index, runtime] = await Promise.all([
      read('docs/stable-workbench-routing.md'),
      read('README.md'),
      read('apps/api/README.md'),
      read('docs/README.md'),
      read('docs/project-runtime.md'),
    ])
    const content = [runbook, root, api, index, runtime].join('\n')
    for (const failure of WORKBENCH_FAILURE_TABLE) {
      expect(runbook).toContain('`' + failure.code + '`')
      expect(runbook).toContain(failure.message)
    }
    for (const topic of [
      '/projects/{projectId}/workbench/',
      '5,000 ms',
      'Root-relative',
      'Cookie',
      'Service-Worker-Allowed',
      'backpressure',
      'reserved code `1006`',
      '0600',
      'redaction',
      'shutdown',
      'zero proxy',
      'DNS/connect/reset/invalid HTTP',
      'exact three-navigation',
      'BL-012',
      'multi-project policy',
      'public authentication',
      'TLS termination',
      'multi-host',
      'No new configuration',
      'No data or configuration migration',
    ])
      expect(content).toContain(topic)
    expect(root).toContain('docs/stable-workbench-routing.md')
    expect(api).toContain('direct `ws` 8.x dependency')
    expect(runtime).toContain('Four HTTP requests plus four WebSocket upgrades')
  })

  it('exposes and composes only root paved validation commands', async () => {
    const justfile = await read('justfile')
    expect(justfile).toContain('verify-workbench-route:')
    expect(justfile).toContain('proof-workbench-route-residual-audit:')
    const verify = justfile.slice(justfile.indexOf('verify:\n'))
    expect(verify).toContain('just verify-workbench-route')
    const focused = justfile.slice(
      justfile.indexOf('verify-workbench-route:'),
      justfile.indexOf('proof-workbench-route-residual-audit:')
    )
    expect(
      focused.trim().endsWith('just proof-workbench-route-residual-audit')
    ).toBe(true)
  })
})
