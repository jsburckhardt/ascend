import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '../../../')
const read = (file: string) => readFile(path.join(root, file), 'utf8')

describe('BL-014 application documentation contract', () => {
  it('documents sequence, ownership, bounds, evidence, cleanup, and exclusions', async () => {
    const [
      runbook,
      readme,
      index,
      runtime,
      routing,
      harness,
      routes,
      proof,
      justfile,
    ] = await Promise.all([
      read('docs/session-switching.md'),
      read('README.md'),
      read('docs/README.md'),
      read('docs/project-runtime.md'),
      read('docs/stable-workbench-routing.md'),
      read('.harness/engineering-harness.md'),
      read('apps/api/src/routes/README.md'),
      read('docs/workbench-proof.md'),
      read('justfile'),
    ])
    expect(runbook).toContain('A → Home → B → Home → C → Home → A')
    expect(runbook).toContain('exactly five Projects/Open re-entries')
    expect(runbook).toContain('250 ms')
    expect(runbook).toContain('90,000 ms')
    expect(runbook).toContain('unsupported')
    expect(runbook).toContain('mode-0600')
    expect(runbook).toContain('All twelve resource classes')
    expect(runbook).toContain('schema-version-3')
    expect(runbook).toContain('project.identityObservationId')
    expect(runbook).toContain('focus observation')
    expect(runbook).toContain('lifecycle-delta observation')
    expect(runbook).toContain('Missing, duplicate, orphan, cross-token')
    expect(runbook).toContain('a-counter.log')
    expect(runbook).toContain('a-counter-identity.json')
    expect(runbook).toContain('predeleted fake paths')
    expect(runbook).not.toContain('schema-version-2 public evidence')
    expect(runbook).toContain(
      'exactly one Management and one ExtensionHost socket'
    )
    expect(runbook).toContain('seeded disposable cookies')
    expect(runbook).toContain('rather than a hardcoded A/B/C list')
    expect(runbook).toContain('FIFO handshake')
    expect(runbook).toContain('no duplicate root `just harness-boot` recipe')
    expect(runbook).toContain(
      'BL-015 performance benchmarking remains deferred'
    )
    expect(runbook).toContain(
      'no public API payload, SQLite schema, configuration default, deployment topology, or migration requirement'
    )
    expect(readme).toContain('Preserve sessions while switching (BL-014)')
    expect(index).toContain('[session-switching.md](session-switching.md)')
    expect(runtime).toContain('BL-014 session reuse proof')
    expect(routing).toContain('BL-014 switching transport')
    expect(harness).toContain('BL-014 session-switching signal')
    expect(routes).toContain('adds no endpoint or payload')
    expect(proof).toContain('dispatched once behind its lock')
    expect(justfile).toContain('verify-session-switching:')
    expect(justfile).toContain('proof-session-switching-residual-audit:')
    expect(justfile).not.toContain('harness-boot:')
  })
})
