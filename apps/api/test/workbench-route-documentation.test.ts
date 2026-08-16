import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { WORKBENCH_FAILURE_TABLE } from '../src/workbench-proxy-contract.js'
import { WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR } from '../src/workbench-route-proof-observation.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

const read = (filePath: string) =>
  readFile(path.join(REPOSITORY_ROOT, filePath), 'utf8')

describe('stable workbench routing documentation and command contract', () => {
  it('documents every behavior, bound, fault, disclosure, cleanup, and exclusion', async () => {
    const [runbook, root, api, index, runtime, core, adr] = await Promise.all([
      read('docs/stable-workbench-routing.md'),
      read('README.md'),
      read('apps/api/README.md'),
      read('docs/README.md'),
      read('docs/project-runtime.md'),
      read(
        'project/architecture/core-components/CORE-COMPONENT-260812-stable-workbench-proxy.md'
      ),
      read(
        'project/architecture/ADR/ADR-260812-in-process-workbench-reverse-proxy.md'
      ),
    ])
    const content = [runbook, root, api, index, runtime, core].join('\n')
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
      'reserved codes `1005` or `1006`',
      '0600',
      'redaction',
      'one-way project token',
      'percent-encoded persisted stable project ID',
      'privacy-safe public evidence',
      'explicitly allows',
      'chunk boundaries',
      'shutdown',
      'zero proxy',
      'DNS/connect/reset/invalid HTTP',
      'exact three-navigation',
      'BL-012',
      'multi-project policy',
      'public authentication',
      'TLS termination',
      'multi-host',
      'no data, schema, API-payload, or configuration migration',
      WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR,
      'opaque VS Code syntax',
      'explicit port',
      'percent-encoded',
      'label-encoded',
      'bounded classes',
      'browser-local',
      'raw host',
      '30-failure',
      'GET /projects/stable-project-id/workbench/',
      'EXTENSIONS_GALLERY={}',
      'Open VSX',
      'Management',
      'ExtensionHost',
      'six network sockets',
      'V-0',
      'Unencoded textual responses',
      'byte-identical binary or encoded responses',
      'marker-bounded',
      'real frames',
      'local throws',
      'execution ID',
    ])
      expect(content).toContain(topic)
    for (const framingDocument of [runbook, api, core, adr]) {
      expect(framingDocument).toContain('Content-Length')
      expect(framingDocument).toContain('byte-identical binary or encoded')
    }
    expect(root).toContain('docs/stable-workbench-routing.md')
    expect(api).toContain('direct `ws` 8.x dependency')
    expect(runtime).toContain('Four HTTP requests plus four WebSocket upgrades')
    expect(core).toContain('createApiServerController')
    expect(core).not.toContain('registerWorkbenchRoutes')
    const failureRows = runbook
      .split('\n')
      .filter((line) => /^\| .* \| [45][0-9][0-9] \| `[^`]+` \|/u.test(line))
    expect(failureRows).toHaveLength(WORKBENCH_FAILURE_TABLE.length)
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
    expect(focused).toContain('EXTENSIONS_GALLERY=')
    expect(focused.indexOf('workbench-capacity-contract.test.ts')).toBeLessThan(
      focused.indexOf('workbench-proxy-contract.test.ts')
    )
    expect(focused.indexOf('workbench-proof-runtime.test.ts')).toBeLessThan(
      focused.indexOf('tests/e2e/workbench-route.spec.ts')
    )
  })
})
