import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  BL020_BOUND_IDS,
  BL020_CLIENT_BOUND_MS,
  BL020_COMPONENT_LANE_SCENARIOS,
  BL020_CONFIRMATION_CLAUSES,
  BL020_DECLARED_BOUNDS,
  BL020_DECLARED_COUNTS,
  BL020_EPISODES,
  BL020_EXECUTED_BASELINE_SCENARIOS,
  BL020_GUARDS,
  BL020_GUARD_IDS,
  BL020_IMPORT_DELTA_VIOLATION_CODES,
  BL020_MUTATION_CLASSES,
  BL020_PRESERVED_EVIDENCE,
  BL020_PRE_CLAIM_SETTLEMENTS,
  BL020_PRIMITIVE_CALLS,
  BL020_PRODUCTION_ENTRYPOINTS,
  BL020_RESIDUAL_CLASSES,
  BL020_SCENARIOS,
  BL020_SCENARIO_BOUNDS,
  BL020_SCENARIO_GROUPS,
  BL020_VALIDATION_ONLY_MODULES,
  BL020_WRITE_CAPABLE_FS_MEMBERS,
  COMMITTED_EVIDENCE_WRITER_PATHS,
  SELECTED_CLOSE_SOURCE_PATHS,
  closeSourceIsTestLocated,
  computeBl020Bounds,
  validateCloseFilesystemLedger,
  validateCloseImportDelta,
  validateCommittedProjectCloseMatrix,
  validateCommittedEvidenceWriters,
  validateProjectCloseMatrix,
  validateSelectedCloseSource,
  type Bl020ScenarioId,
  type Bl020GuardId,
  type CloseComponentWitness,
  type CloseImportDelta,
  type CloseImportDeltaFacts,
  type CommittedEvidenceWriters,
  type ProjectCloseMatrix,
  type ProjectCloseMutationSummary,
  type SelectedCloseSources,
} from '../src/project-close-evidence.js'
import {
  createProjectRuntimeConfig,
  reconciliationEndToEndBoundMs,
  restartQuarantineReleaseBoundMs,
  runtimeCloseOverallBoundMs,
  runtimeCloseReleaseBoundMs,
} from '../src/project-runtime-contract.js'
import {
  mutateSource,
  mutateWriter,
  readBaseCloseSources,
  readCommittedEvidenceWriters,
  readSelectedCloseSources,
  resolveBaseSha,
} from './project-close-source-guards.js'
import {
  buildMutationBaseline,
  type Bl020MutationBaseline,
} from './project-close-mutations.js'
import {
  collectImportDeltaFacts,
  IMPORT_DELTA_CONTROLS,
  measureImportDelta,
} from './project-close-non-mutation-support.js'

let sources: SelectedCloseSources
let baseSources: Partial<SelectedCloseSources>
let importDeltaFacts: CloseImportDeltaFacts
let importDelta: CloseImportDelta

beforeAll(async () => {
  sources = await readSelectedCloseSources()
  baseSources = await readBaseCloseSources(await resolveBaseSha())
  // `G-23`'s scope is computed from the repository, so its contract is checked
  // against the branch head itself rather than against a declared file list.
  importDeltaFacts = await collectImportDeltaFacts()
  importDelta = await measureImportDelta()
})

const guardViolations = (candidate: SelectedCloseSources): readonly string[] =>
  validateSelectedCloseSource({ sources: candidate, baseSources })

interface NegativeControl {
  readonly guard: Bl020GuardId
  readonly name: string
  readonly file: keyof SelectedCloseSources
  readonly from: string
  readonly to: string
}

/**
 * Every static source guard's negative control. Each anchor is asserted
 * present by `mutateSource`, so a renamed region fails loudly rather than
 * silently skipping its control.
 */
const NEGATIVE_CONTROLS: readonly NegativeControl[] = [
  {
    guard: 'G-1',
    name: 'a second commitRemoval invocation site',
    file: 'runtimeManager',
    from: '      const removal = input.commitRemoval()',
    to: '      const removal = input.commitRemoval()\n      void input.commitRemoval()',
  },
  {
    guard: 'G-2',
    name: 'the confirmation predicate no longer dominates removal',
    file: 'runtimeManager',
    from: '      const notRetired = !retiredProjects.has(projectId)',
    to: '      const notRetiredRelocated = !retiredProjects.has(projectId)',
  },
  {
    guard: 'G-3',
    name: 'a route calling durable removal',
    file: 'projectsRoute',
    from: '        const result = await fastify.projectClose.closeProject(id)',
    to: '        const result = await fastify.projectClose.closeProject(id)\n        await library.closeProject(id)',
  },
  {
    guard: 'G-4',
    name: 'a literal entry write outside installEntry',
    file: 'runtimeManager',
    from: '  const retireProject = (projectId: string): void => {\n    entries.delete(projectId)',
    to: '  const retireProject = (projectId: string): void => {\n    entries.set(projectId, undefined as never)\n    entries.delete(projectId)',
  },
  {
    guard: 'G-4',
    name: 'an installEntry call whose result is discarded',
    file: 'runtimeManager',
    from: '      retireProject(projectId)',
    to: '      installEntry(projectId, undefined as never)\n      retireProject(projectId)',
  },
  {
    guard: 'G-4',
    name: 'the retirement consult deleted from installEntry',
    file: 'runtimeManager',
    from: '    if (entryInstallRefusal(projectId, owner) !== undefined) {\n      accountLateCloseSettlement(projectId)',
    to: '    if (closeClaimFailure(projectId) !== undefined) {\n      accountLateCloseSettlement(projectId)',
  },
  {
    guard: 'G-5',
    name: 'an awaited delay primitive inside the close region',
    file: 'runtimeManager',
    from: '      const drained = await drain()',
    to: '      await processDependencies.sleep(1, claim.controller.signal)\n      const drained = await drain()',
  },
  {
    guard: 'G-6',
    name: 'a close deadline armed from a raw timer',
    file: 'runtimeManager',
    from: '    const cancelDrainDeadline = deadlineScheduler.scheduleDeadline(',
    to: '    const cancelDrainDeadline = setTimeout(',
  },
  {
    guard: 'G-7',
    name: 'a self-derived drain deadline in the proxy',
    file: 'proxyManager',
    from: "      signal.addEventListener('abort', check, { once: true })",
    to: "      setTimeout(resolve, 5)\n      signal.addEventListener('abort', check, { once: true })",
  },
  {
    guard: 'G-7',
    name: 'an uncaptured drain observation gap',
    file: 'proxyManager',
    from: '        pollHandle = setTimeout(check, 1)',
    to: '        setTimeout(check, 1)',
  },
  {
    guard: 'G-7',
    name: 'a retained drain poll handle',
    file: 'proxyManager',
    from: '          if (pollHandle !== undefined) clearTimeout(pollHandle)',
    to: '          if (pollHandle !== undefined) void pollHandle',
  },
  {
    guard: 'G-7',
    name: 'a retained drain abort listener',
    file: 'proxyManager',
    from: "          signal.removeEventListener('abort', check)",
    to: '          void signal',
  },
  {
    guard: 'G-8',
    name: 'an unfiltered resource map in the drain',
    file: 'proxyManager',
    from: '    for (const socket of selected(webSockets)) socket.terminate()',
    to: '    for (const socket of webSockets) socket.terminate()',
  },
  {
    guard: 'G-9',
    name: 'a target resolution inside the drain',
    file: 'proxyManager',
    from: '  ): Promise<WorkbenchProxyAudit> => {\n    const projectToken = deriveProjectOwnerToken(projectId)\n    const selected =',
    to: '  ): Promise<WorkbenchProxyAudit> => {\n    const projectToken = deriveProjectOwnerToken(projectId)\n    void resolveTarget(projectId)\n    const selected =',
  },
  {
    guard: 'G-10',
    name: 'a suspension between the entry read and the claim install',
    file: 'runtimeManager',
    from: '    closeClaims.set(projectId, claim)',
    to: '    await Promise.resolve()\n    closeClaims.set(projectId, claim)',
  },
  {
    guard: 'G-11',
    name: 'the claim retained on the fault path',
    file: 'runtimeManager',
    from: '        if (closeClaims.get(projectId) === claim) closeClaims.delete(projectId)',
    to: '        void claim',
  },
  {
    guard: 'G-12',
    name: 'a foreign lifecycle name inside the close region',
    file: 'runtimeManager',
    from: '      const drained = await drain()',
    to: "      const foreign = 'runtime.stop.requested'\n      void foreign\n      const drained = await drain()",
  },
  {
    guard: 'G-13',
    name: 'a second lifecycle emission inside the close region',
    file: 'runtimeManager',
    from: '      const drained = await drain()',
    to: "      emit({\n        event: 'runtime.health.changed',\n        projectId,\n        from: 'running',\n        to: 'failed',\n        elapsedMs: 0,\n        classification: 'close-release-unconfirmed',\n      })\n      const drained = await drain()",
  },
  {
    guard: 'G-14',
    name: 'a second project.closed emission site',
    file: 'projectsRoute',
    from: '        return sendCloseResult(reply, result)',
    to: '        request.log.info({ event: PROJECT_CLOSED_EVENT })\n        return sendCloseResult(reply, result)',
  },
  {
    guard: 'G-16',
    name: 'a new persistence column reference',
    file: 'persistence',
    from: '        .where(eq(projects.id, id))',
    to: '        .where(eq(projects.closedAt, id))',
  },
  {
    guard: 'G-17',
    name: 'a widened delivered entry-state vocabulary',
    file: 'runtimeContract',
    from: "  'reconciling',\n  'failed',\n] as const\nexport type RuntimeEntryState",
    to: "  'reconciling',\n  'failed',\n  'closing',\n] as const\nexport type RuntimeEntryState",
  },
  {
    guard: 'G-18',
    name: 'a removed published failure row',
    file: 'proxyContract',
    from: "    row(\n      'manager-shutdown',\n      503,\n      'workbench_shutting_down',\n      'Workbench routing is shutting down.'\n    ),\n  ])",
    to: '  ])',
  },
  {
    guard: 'G-19',
    name: 'the stop route losing the close-in-progress category',
    file: 'stopRoute',
    from: "  'close-in-progress': [409, 'runtime_close_in_progress'],",
    to: '',
  },
  {
    guard: 'G-20',
    name: 'a client timeout below the manager cap bound',
    file: 'webProjects',
    from: 'export const PROJECT_CLOSE_TIMEOUT_MS = 45_000 as const',
    to: 'export const PROJECT_CLOSE_TIMEOUT_MS = 41_000 as const',
  },
  {
    guard: 'G-21',
    name: 'a deleted post-await claim recheck on the starting-join seam',
    file: 'runtimeManager',
    from: '      const joinRefusal = entryInstallRefusal(input.projectId)\n      if (joinRefusal !== undefined) throw refuseAcquisition(joinRefusal)\n      return joined',
    to: '      return joined',
  },
  {
    guard: 'G-24',
    name: 'an ungated sweep multiplier',
    file: 'runtimeContract',
    from: '    units * runtimeStopOverallBoundMs(config)',
    to: '    sweepUnits * runtimeStopOverallBoundMs(config)',
  },
  {
    guard: 'G-25',
    name: 'a suspension between confirmation and removal',
    file: 'runtimeManager',
    from: '      claim.sealed = true\n      const removal = input.commitRemoval()',
    to: '      await Promise.resolve()\n      claim.sealed = true\n      const removal = input.commitRemoval()',
  },
  {
    guard: 'G-25',
    name: 'a second call between confirmation and removal',
    file: 'runtimeManager',
    from: '      claim.sealed = true\n      const removal = input.commitRemoval()',
    to: '      recordCleanup(projectId, audits[0]!)\n      claim.sealed = true\n      const removal = input.commitRemoval()',
  },
  {
    guard: 'G-25',
    name: 'the seal assignment deleted',
    file: 'runtimeManager',
    from: '      claim.sealed = true\n      const removal = input.commitRemoval()',
    to: '      const removal = input.commitRemoval()',
  },
  {
    guard: 'G-26',
    name: 'a runtime-closing failure installed as an entry',
    file: 'runtimeManager',
    from: "      const failure = new RuntimeFailure('close-release-unconfirmed')",
    to: "      const failure = new RuntimeFailure('runtime-closing')",
  },
  {
    guard: 'G-27',
    name: 'the seal consult deleted from installEntry',
    file: 'runtimeManager',
    from: '    owner !== undefined && closeClaims.get(projectId) === owner && !owner.sealed',
    to: '    owner !== undefined && closeClaims.get(projectId) === owner',
  },
  {
    guard: 'G-27',
    name: 'the seal consult deleted from registerOwnership',
    file: 'runtimeManager',
    from: '    if (claim?.sealed === true) {',
    to: '    if (claim === undefined) {',
  },
  {
    guard: 'G-27',
    name: 'a seal lift added to the success branch',
    file: 'runtimeManager',
    from: '      retireProject(projectId)',
    to: '      claim.sealed = false\n      retireProject(projectId)',
  },
]

describe('BL-020 evidence contract catalog', () => {
  it('declares exactly seventy-five scenarios in frozen order', () => {
    expect(BL020_SCENARIOS).toHaveLength(BL020_DECLARED_COUNTS.scenarios)
    expect(new Set(BL020_SCENARIOS).size).toBe(BL020_DECLARED_COUNTS.scenarios)
    expect([...BL020_SCENARIOS]).toEqual(
      Array.from({ length: 75 }, (_value, index) => 'S-' + String(index + 1))
    )
  })

  it('partitions every scenario into exactly one declared group', () => {
    const grouped = Object.values(BL020_SCENARIO_GROUPS).flatMap((group) => [
      ...group,
    ])
    expect(grouped).toEqual([...BL020_SCENARIOS])
    expect(Object.keys(BL020_SCENARIO_GROUPS)).toHaveLength(15)
  })

  it('declares the frozen vocabularies and cardinalities', () => {
    expect(BL020_GUARD_IDS).toHaveLength(BL020_DECLARED_COUNTS.guards)
    expect(BL020_MUTATION_CLASSES).toHaveLength(BL020_DECLARED_COUNTS.mutations)
    expect(BL020_BOUND_IDS).toHaveLength(BL020_DECLARED_COUNTS.bounds)
    expect(BL020_EPISODES).toHaveLength(BL020_DECLARED_COUNTS.episodes)
    expect(BL020_PRIMITIVE_CALLS).toHaveLength(
      BL020_DECLARED_COUNTS.primitiveCalls
    )
    expect(BL020_RESIDUAL_CLASSES).toHaveLength(
      BL020_DECLARED_COUNTS.residualClasses
    )
    expect(BL020_CONFIRMATION_CLAUSES).toHaveLength(
      BL020_DECLARED_COUNTS.confirmationClauses
    )
    expect(
      new Set(BL020_MUTATION_CLASSES.map((entry) => entry.violation)).size
    ).toBe(BL020_DECLARED_COUNTS.mutations)
  })

  it('declares the revision-6 cardinalities as literal values', () => {
    expect(BL020_DECLARED_COUNTS.guards).toBe(28)
    expect(BL020_DECLARED_COUNTS.preClaimSettlements).toBe(8)
    expect(BL020_DECLARED_COUNTS.scenarios).toBe(75)
    expect(BL020_DECLARED_COUNTS.mutations).toBe(18)
    expect(BL020_DECLARED_COUNTS.bounds).toBe(20)
    expect(BL020_DECLARED_COUNTS.selectedSources).toBe(15)
    expect(BL020_DECLARED_COUNTS.evidenceWriters).toBe(3)
  })

  it('freezes the eight pre-claim settlement sites in admission order', () => {
    expect([...BL020_PRE_CLAIM_SETTLEMENTS]).toEqual([
      'manager-shutdown',
      'persisted-absence',
      'contender-join',
      'reconcile-in-progress',
      'reconcile-unresolved',
      'start-in-progress',
      'restart-in-progress',
      'stop-in-progress',
    ])
    expect(BL020_PRE_CLAIM_SETTLEMENTS).toHaveLength(
      BL020_DECLARED_COUNTS.preClaimSettlements
    )
  })

  it('records the prior evidence digests this change set must preserve', () => {
    expect(Object.keys(BL020_PRESERVED_EVIDENCE)).toHaveLength(3)
    for (const digest of Object.values(BL020_PRESERVED_EVIDENCE)) {
      expect(digest).toMatch(/^[0-9a-f]{64}$/u)
    }
  })
})

describe('BL-020 frozen source sets', () => {
  it('declares fifteen selected sources and three evidence writers', () => {
    expect(Object.keys(SELECTED_CLOSE_SOURCE_PATHS)).toHaveLength(
      BL020_DECLARED_COUNTS.selectedSources
    )
    expect(Object.keys(COMMITTED_EVIDENCE_WRITER_PATHS)).toHaveLength(
      BL020_DECLARED_COUNTS.evidenceWriters
    )
  })

  it('gives every guard exactly one source set and a non-empty scanned subset of it', () => {
    const selected = new Set(Object.values(SELECTED_CLOSE_SOURCE_PATHS))
    const writerPaths = new Set(Object.values(COMMITTED_EVIDENCE_WRITER_PATHS))
    expect(BL020_GUARDS).toHaveLength(BL020_DECLARED_COUNTS.guards)
    expect(BL020_GUARDS.map((guard) => guard.id)).toEqual([...BL020_GUARD_IDS])
    for (const guard of BL020_GUARDS) {
      // `G-23` alone declares neither frozen set: revision 8 computes its
      // scope from the repository, so it may not be declared by a file list.
      if (guard.sourceSet === 'computed') {
        expect(guard.id).toBe('G-23')
        expect(guard.scannedFiles).toEqual([])
        continue
      }
      expect(guard.scannedFiles.length).toBeGreaterThan(0)
      const set = guard.sourceSet === 'selected' ? selected : writerPaths
      for (const file of guard.scannedFiles) expect(set.has(file)).toBe(true)
    }
    expect(
      BL020_GUARDS.filter((guard) => guard.sourceSet === 'computed')
    ).toHaveLength(1)
    expect(
      BL020_GUARDS.find((guard) => guard.id === 'G-19')?.scannedFiles
    ).toEqual(
      expect.arrayContaining([
        SELECTED_CLOSE_SOURCE_PATHS.stopRoute,
        SELECTED_CLOSE_SOURCE_PATHS.restartRoute,
        SELECTED_CLOSE_SOURCE_PATHS.webRuntimeState,
      ])
    )
    expect(
      BL020_GUARDS.find((guard) => guard.id === 'G-22')?.scannedFiles
    ).toEqual(Object.values(COMMITTED_EVIDENCE_WRITER_PATHS))
    expect(new Set(BL020_GUARDS.map((guard) => guard.code)).size).toBe(
      BL020_DECLARED_COUNTS.guards
    )
  })

  it('declares the two production entry points, five validation-only modules, and seven G-23 codes', () => {
    expect(BL020_PRODUCTION_ENTRYPOINTS).toHaveLength(
      BL020_DECLARED_COUNTS.productionEntrypoints
    )
    expect(BL020_VALIDATION_ONLY_MODULES).toHaveLength(
      BL020_DECLARED_COUNTS.validationOnlyModules
    )
    expect(BL020_IMPORT_DELTA_VIOLATION_CODES).toHaveLength(
      BL020_DECLARED_COUNTS.importDeltaViolationCodes
    )
    expect(BL020_DECLARED_COUNTS.productionEntrypoints).toBe(2)
    expect(BL020_DECLARED_COUNTS.validationOnlyModules).toBe(5)
    expect(BL020_DECLARED_COUNTS.importDeltaViolationCodes).toBe(7)
    expect(Object.isFrozen(BL020_PRODUCTION_ENTRYPOINTS)).toBe(true)
    expect(Object.isFrozen(BL020_VALIDATION_ONLY_MODULES)).toBe(true)
    expect(Object.isFrozen(BL020_IMPORT_DELTA_VIOLATION_CODES)).toBe(true)
    expect(new Set(BL020_IMPORT_DELTA_VIOLATION_CODES).size).toBe(
      BL020_IMPORT_DELTA_VIOLATION_CODES.length
    )
    // Both entry points exist and are readable at the branch head, and no
    // exempt module lies in a test location, so the two exemption grounds —
    // ratified membership and a structurally non-shipped location — stay
    // independently meaningful.
    const heads = new Map(
      importDeltaFacts.sources.map((source) => [source.file, source.text])
    )
    for (const entryPoint of BL020_PRODUCTION_ENTRYPOINTS) {
      expect(heads.get(entryPoint)?.length ?? 0).toBeGreaterThan(0)
      expect(closeSourceIsTestLocated(entryPoint)).toBe(false)
    }
    const closure = new Set(importDelta.closure)
    for (const module of BL020_VALIDATION_ONLY_MODULES) {
      expect(heads.has(module), module + ' exists at the branch head').toBe(
        true
      )
      expect(closeSourceIsTestLocated(module)).toBe(false)
      expect(closure.has(module), module + ' is entry-point unreachable').toBe(
        false
      )
    }
  })
})

describe('BL-020 source guards', () => {
  it('accepts the delivered branch-head sources', () => {
    expect(guardViolations(sources)).toEqual([])
  })

  it('accepts the base-SHA sources for the positive controls of G-5 and G-6', () => {
    const manager = baseSources.runtimeManager
    expect(manager).toBeDefined()
    // The delivered delay primitive lives outside the close region at the base
    // revision too, so a passing base proves the region is scoped narrowly.
    expect(manager).toContain('.sleep(runtimeStopOverallBoundMs(')
  })

  it.each(
    NEGATIVE_CONTROLS.map(
      (control) => [control.guard + ': ' + control.name, control] as const
    )
  )('fails %s', (_label, control) => {
    const guard = BL020_GUARDS.find((entry) => entry.id === control.guard)
    expect(guard).toBeDefined()
    const mutated = mutateSource(
      sources,
      control.file,
      control.from,
      control.to
    )
    expect(guardViolations(mutated)).toContain(guard!.code)
  })

  it('covers every static source guard with at least one negative control', () => {
    const covered = new Set<Bl020GuardId>([
      ...NEGATIVE_CONTROLS.map((control) => control.guard),
      ...WRITER_CONTROLS.map((control) => control.guard),
    ])
    // `G-15` is the executed filesystem ledger, controlled by its own suite
    // over an executed record rather than over source text.
    // `G-23` is the computed import delta, controlled by the seven-code table
    // below over measured repository facts rather than over source text.
    const executedOrExternal = new Set<Bl020GuardId>(['G-15', 'G-23'])
    for (const guard of BL020_GUARDS) {
      if (executedOrExternal.has(guard.id)) continue
      expect(covered.has(guard.id)).toBe(true)
    }
  })
})

describe('BL-020 G-15 executed filesystem guard', () => {
  // Both boundaries expose every frozen write-capable member they can, and the
  // ledger declares what each one actually wrapped.
  const instrumentation = [
    {
      module: 'node:fs',
      available: [...BL020_WRITE_CAPABLE_FS_MEMBERS],
      instrumented: [...BL020_WRITE_CAPABLE_FS_MEMBERS],
    },
    {
      module: 'node:fs/promises',
      available: BL020_WRITE_CAPABLE_FS_MEMBERS.filter(
        (member) => member !== 'createWriteStream'
      ),
      instrumented: BL020_WRITE_CAPABLE_FS_MEMBERS.filter(
        (member) => member !== 'createWriteStream'
      ),
    },
  ]
  const ledger = {
    instrumented: true,
    instrumentation,
    registeredProjectRoots: ['/proof/projects/p', '/proof/projects/q'],
    permittedRoots: ['/proof/tmp/runtime', '/proof/db'],
    calls: [
      {
        member: 'mkdir',
        path: '/proof/tmp/runtime/data',
        writeCapable: true,
        origin: 'apps/api/src/project-runtime-process.ts',
        productModule: true,
      },
      {
        member: 'mkdir',
        path: '/proof/db',
        writeCapable: true,
        origin: 'apps/api/src/project-library.ts',
        productModule: true,
      },
    ],
  } as const

  it('accepts runtime tmp cleanup and database directory creation', () => {
    expect(validateCloseFilesystemLedger(ledger)).toEqual([])
  })

  it('fails a write inside a registered project root', () => {
    expect(
      validateCloseFilesystemLedger({
        ...ledger,
        calls: [
          ...ledger.calls,
          {
            member: 'writeFile',
            path: '/proof/projects/p/marker.txt',
            writeCapable: true,
            origin: 'apps/api/test/project-close-non-mutation.test.ts',
            productModule: false,
          },
        ],
      })
    ).toContain('project-directory-content-non-mutation')
  })

  it('fails an uninstrumented ledger', () => {
    expect(
      validateCloseFilesystemLedger({ ...ledger, instrumented: false })
    ).toContain('project-directory-content-non-mutation')
  })

  it('fails a partially instrumented module boundary', () => {
    expect(
      validateCloseFilesystemLedger({
        ...ledger,
        instrumentation: [
          {
            ...instrumentation[0]!,
            instrumented: instrumentation[0]!.instrumented.filter(
              (member) => member !== 'rename'
            ),
          },
          instrumentation[1]!,
        ],
      })
    ).toContain('project-directory-content-non-mutation')
  })

  it('fails a frozen member no boundary instruments', () => {
    expect(
      validateCloseFilesystemLedger({
        ...ledger,
        instrumentation: [instrumentation[1]!],
      })
    ).toContain('project-directory-content-non-mutation')
  })

  it('fails a product-module write outside both permitted families', () => {
    expect(
      validateCloseFilesystemLedger({
        ...ledger,
        calls: [
          ...ledger.calls,
          {
            member: 'writeFile',
            path: '/proof/elsewhere/report.json',
            writeCapable: true,
            origin: 'apps/api/src/project-close.ts',
            productModule: true,
          },
        ],
      })
    ).toContain('project-directory-content-non-mutation')
  })

  it('fails a permitted root that lies inside a registered project root', () => {
    expect(
      validateCloseFilesystemLedger({
        ...ledger,
        permittedRoots: ['/proof/projects/p/tmp'],
      })
    ).toContain('project-directory-content-non-mutation')
  })
})

describe('BL-020 G-23 computed import delta', () => {
  it('passes on the branch head, where the required validation modules do add write-capable members', () => {
    // The head-tree positive control: this plan's own residual-audit CLI,
    // fixture builders, and evidence writers legitimately add `mkdir`, `rm`,
    // `writeFile`, `rename`, and `symlink`, and the corrected scope is proven
    // satisfiable rather than assumed.
    expect(validateCloseImportDelta(importDelta)).toEqual([])
    const exemptWriters = importDelta.entries.filter(
      (entry) =>
        !entry.governed &&
        entry.headMembers.some((member) =>
          (BL020_WRITE_CAPABLE_FS_MEMBERS as readonly string[]).includes(member)
        )
    )
    expect(exemptWriters.length).toBeGreaterThan(0)
    expect(
      exemptWriters.every((entry) => entry.role === 'validation-harness')
    ).toBe(true)
  })

  it('governs every changed selected source although it declares no source set', () => {
    const declaration = BL020_GUARDS.find((guard) => guard.id === 'G-23')
    expect(declaration?.sourceSet).toBe('computed')
    expect(declaration?.scannedFiles).toEqual([])
    expect(
      (BL020_IMPORT_DELTA_VIOLATION_CODES as readonly string[]).includes(
        declaration?.code ?? ''
      )
    ).toBe(true)
    const measured = new Map(
      importDelta.entries.map((entry) => [entry.file, entry])
    )
    const changedSelected = Object.values(SELECTED_CLOSE_SOURCE_PATHS).filter(
      (file) => measured.has(file)
    )
    expect(changedSelected.length).toBeGreaterThan(0)
    for (const file of changedSelected) {
      expect(measured.get(file)?.role).toBe('production')
      expect(measured.get(file)?.governed).toBe(true)
    }
  })

  it.each(
    IMPORT_DELTA_CONTROLS.map((control) => [control.name, control] as const)
  )('fails its negative control: %s', (_name, control) => {
    const violations = validateCloseImportDelta(
      control.corrupt(importDeltaFacts, importDelta)
    )
    expect(violations).toEqual([...control.expected])
    expect(violations).toContain(control.code)
  })

  it('declares one negative control per violation code and no code that absorbs another', () => {
    expect(IMPORT_DELTA_CONTROLS.length).toBeGreaterThanOrEqual(8)
    for (const code of BL020_IMPORT_DELTA_VIOLATION_CODES)
      expect(
        IMPORT_DELTA_CONTROLS.some((control) => control.code === code),
        code + ' has a negative control'
      ).toBe(true)
    // Every code a control expects is one of the seven, and each control is
    // rejected by the code it aims at rather than by a neighbour's.
    for (const control of IMPORT_DELTA_CONTROLS) {
      expect(control.expected).toContain(control.code)
      for (const code of control.expected)
        expect(
          (BL020_IMPORT_DELTA_VIOLATION_CODES as readonly string[]).includes(
            code
          )
        ).toBe(true)
    }
  })
})

interface WriterControl {
  readonly guard: Bl020GuardId
  readonly name: string
  readonly file: keyof CommittedEvidenceWriters
  /** Empty appends the control text; otherwise the anchor must be present. */
  readonly from: string
  readonly to: string
  readonly violation: string
}

/**
 * Every negative control of the two guards that read the committed evidence
 * writers. `G-22` controls inject a protected raw value; `G-28` controls
 * replace a site-keyed admission test with a category-keyed one, break the
 * frozen site enumeration, or plant a settled-category list to consult.
 */
const WRITER_CONTROLS: readonly WriterControl[] = [
  {
    guard: 'G-22',
    name: 'an absolute path',
    file: 'matrixTest',
    from: '',
    to: "const root = '/home/vscode/projects'",
    violation: 'evidence-writer-redaction:matrixTest:absolute-path',
  },
  {
    guard: 'G-22',
    name: 'a process identity',
    file: 'matrixTest',
    from: '',
    to: 'const identity = process.pid',
    violation: 'evidence-writer-redaction:matrixTest:process-identity',
  },
  {
    guard: 'G-22',
    name: 'a port literal',
    file: 'matrixTest',
    from: '',
    to: "const authority = '127.0.0.1:4173'",
    violation: 'evidence-writer-redaction:matrixTest:port-literal',
  },
  {
    guard: 'G-22',
    name: 'a stack read',
    file: 'matrixTest',
    from: '',
    to: 'const trace = error.stack',
    violation: 'evidence-writer-redaction:matrixTest:stack',
  },
  {
    guard: 'G-28',
    name: 'a reordered pre-claim site enumeration',
    file: 'evidenceModule',
    from: "  'manager-shutdown',\n  'persisted-absence',",
    to: "  'persisted-absence',\n  'manager-shutdown',",
    violation: 'admission-site-discrimination:enumeration',
  },
  {
    guard: 'G-28',
    name: 'a settled-category list in the matrix writer',
    file: 'matrixTest',
    from: '',
    to: "const preClaim = ['manager-shutdown', 'stop-in-progress']",
    violation: 'admission-site-discrimination:matrixTest:category-list',
  },
  {
    guard: 'G-28',
    name: 'a category-derived admission test in the matrix writer',
    file: 'matrixTest',
    from: 'const admittedBySite = row.preClaimSettlement === null',
    to: "const admittedBySite = row.outcome === 'closed'",
    violation: 'admission-site-discrimination:matrixTest:category-derived',
  },
  {
    guard: 'G-28',
    name: 'a matrix writer that reads claim instants with no site test',
    file: 'matrixTest',
    from: 'const admittedBySite = row.preClaimSettlement === null',
    to: "const admittedByOutcome = row.outcome === 'closed'",
    violation: 'admission-site-discrimination:matrixTest:site-test-absent',
  },
]

describe('BL-020 evidence writer guards', () => {
  let writers: CommittedEvidenceWriters

  beforeAll(async () => {
    writers = await readCommittedEvidenceWriters()
  })

  it('accepts the three committed evidence writers', () => {
    expect(validateCommittedEvidenceWriters(writers)).toEqual([])
  })

  it.each(
    WRITER_CONTROLS.map(
      (control) => [control.guard + ': ' + control.name, control] as const
    )
  )('fails %s', (_label, control) => {
    const mutated = mutateWriter(
      writers,
      control.file,
      control.from,
      control.to
    )
    expect(validateCommittedEvidenceWriters(mutated)).toContain(
      control.violation
    )
  })
})

describe('BL-020 declared bounds', () => {
  const config = createProjectRuntimeConfig()
  const cap = config.closeOwnershipSweepCap

  it('recomputes all twenty bounds from production constants and functions', () => {
    const expected: Readonly<Record<string, number>> = {
      'B-1': config.closeDrainAllowanceMs,
      'B-2': runtimeCloseReleaseBoundMs(config, false, 1),
      'B-3': runtimeCloseReleaseBoundMs(config, true, 1),
      'B-4': config.closeSettlementAllowanceMs,
      'B-5': runtimeCloseOverallBoundMs(config, false, 1),
      'B-6': runtimeCloseOverallBoundMs(config, true, 1),
      'B-7': runtimeCloseReleaseBoundMs(config, false, 2),
      'B-8': runtimeCloseOverallBoundMs(config, false, 2),
      'B-9': runtimeCloseReleaseBoundMs(config, false, cap),
      'B-10': runtimeCloseOverallBoundMs(config, false, cap),
      'B-11': runtimeCloseReleaseBoundMs(config, true, cap),
      'B-12': runtimeCloseOverallBoundMs(config, true, cap),
      'B-13': BL020_CLIENT_BOUND_MS.projectClose,
      'B-14': BL020_CLIENT_BOUND_MS.projectList,
      'B-15': BL020_CLIENT_BOUND_MS.runtimeState,
      'B-16': config.gracefulShutdownMs,
      'B-17': config.forceShutdownMs,
      'B-18': config.stopAuditAllowanceMs,
      'B-19': restartQuarantineReleaseBoundMs(config),
      'B-20': reconciliationEndToEndBoundMs(config),
    }
    expect(computeBl020Bounds(config).map((bound) => bound.id)).toEqual([
      ...BL020_BOUND_IDS,
    ])
    for (const bound of computeBl020Bounds(config)) {
      expect(bound.valueMs).toBe(expected[bound.id])
    }
  })

  it('matches the exact arithmetic the plan declares', () => {
    const value = (id: string): number =>
      BL020_DECLARED_BOUNDS.find((bound) => bound.id === id)!.valueMs
    expect(value('B-1')).toBe(5_000)
    expect(value('B-2')).toBe(5_000)
    expect(value('B-3')).toBe(20_000)
    expect(value('B-4')).toBe(1_000)
    expect(value('B-5')).toBe(11_000)
    expect(value('B-6')).toBe(26_000)
    expect(value('B-7')).toBe(10_000)
    expect(value('B-8')).toBe(16_000)
    expect(value('B-9')).toBe(20_000)
    expect(value('B-10')).toBe(26_000)
    expect(value('B-11')).toBe(35_000)
    expect(value('B-12')).toBe(41_000)
    expect(value('B-13')).toBe(45_000)
    expect(value('B-19')).toBe(15_000)
    expect(value('B-20')).toBe(15_000)
  })

  it('rejects an unsafe, non-integer, or over-cap sweep multiplier', () => {
    expect(() => runtimeCloseReleaseBoundMs(config, false, 0)).toThrow()
    expect(() => runtimeCloseReleaseBoundMs(config, false, 1.5)).toThrow()
    expect(() => runtimeCloseReleaseBoundMs(config, false, cap + 1)).toThrow()
    expect(() => runtimeCloseOverallBoundMs(config, true, Number.NaN)).toThrow()
  })

  it('assigns every scenario a declared bound from the twenty-member table', () => {
    const ids = new Set<string>(BL020_BOUND_IDS)
    for (const scenario of BL020_SCENARIOS) {
      expect(ids.has(BL020_SCENARIO_BOUNDS[scenario])).toBe(true)
    }
    expect(BL020_SCENARIO_BOUNDS['S-71']).toBe('B-8')
    expect(BL020_SCENARIO_BOUNDS['S-75']).toBe('B-5')
    expect(BL020_SCENARIO_BOUNDS['S-6']).toBe('B-6')
    expect(BL020_SCENARIO_BOUNDS['S-49']).toBe('B-20')
    expect(BL020_SCENARIO_BOUNDS['S-32']).toBe('B-13')
  })
})

describe('BL-020 committed matrix contract', () => {
  /**
   * A substrate built from real executed rows and re-minted execution
   * identities, so the committed-artifact rules can be proven positively and
   * then broken one at a time. It is a validator fixture, never evidence: the
   * committed matrix is assembled by execution in the matrix writer.
   */
  const witnessFor = (
    scenario: Bl020ScenarioId,
    runId: string
  ): CloseComponentWitness =>
    Object.freeze({
      artifact: 'bl-020-close-component-matrix',
      runId,
      executionId: scenario + '-' + runId,
      scenario,
      outcome: 'passed',
      allPassed: true,
      assertions: 12,
      cards: 2,
      admissions: 1,
      renderedAdmissions: 1,
      productionPathsEntered: Object.freeze(['project-home']),
      dialogOpenings: 1,
      dialogMaxConcurrent: 1,
      refusedPeerOpenings: 0,
      pendingObservations: 1,
      focusObservations: 1,
      announcements: 1,
      namePrefixedAnnouncements: 1,
      closeRequests: 1,
      listRequests: 1,
      listReplacements: 1,
      runtimeStateRequests: 1,
      transportInvocations: 3,
      thenableTransportReturns: 3,
    })

  const committable = (): ProjectCloseMatrix => {
    const runId = randomUUID()
    const rows = baseline.matrix.rows.map((row) =>
      Object.freeze({
        ...structuredClone(row),
        executionId: row.scenario + '-' + randomUUID(),
        componentWitness: (
          BL020_COMPONENT_LANE_SCENARIOS as readonly string[]
        ).includes(row.scenario)
          ? witnessFor(row.scenario, runId)
          : null,
      })
    )
    return Object.freeze({
      ...baseline.matrix,
      rows: Object.freeze(rows),
      mutations: mutationSummary,
    }) as ProjectCloseMatrix
  }

  let baseline: Bl020MutationBaseline
  let mutationSummary: ProjectCloseMutationSummary

  beforeAll(async () => {
    baseline = await buildMutationBaseline()
    mutationSummary = Object.freeze({
      declared: BL020_DECLARED_COUNTS.mutations,
      executed: BL020_DECLARED_COUNTS.mutations,
      killed: BL020_DECLARED_COUNTS.mutations,
      survived: 0,
      baselineRows: BL020_DECLARED_COUNTS.scenarios,
      baselineViolations: Object.freeze([]),
      executedBaselineScenarios: BL020_EXECUTED_BASELINE_SCENARIOS,
      witnesses: Object.freeze(
        BL020_MUTATION_CLASSES.map((declared) => ({
          id: declared.id,
          violation: declared.violation,
          killed: true,
          witness: declared.id + ' witness',
        }))
      ),
    })
  }, 300_000)

  it('names the ten component-lane scenarios and five executed baselines', () => {
    expect(BL020_COMPONENT_LANE_SCENARIOS).toEqual([
      'S-32',
      'S-33',
      'S-34',
      'S-35',
      'S-36',
      'S-37',
      'S-65',
      'S-66',
      'S-72',
      'S-73',
    ])
    expect(BL020_EXECUTED_BASELINE_SCENARIOS).toEqual([
      'S-69',
      'S-70',
      'S-71',
      'S-74',
      'S-75',
    ])
    for (const scenario of [
      ...BL020_COMPONENT_LANE_SCENARIOS,
      ...BL020_EXECUTED_BASELINE_SCENARIOS,
    ]) {
      expect(BL020_SCENARIOS).toContain(scenario)
    }
  })

  it('accepts a matrix of executed rows carrying every joined receipt', () => {
    const matrix = committable()
    expect(validateProjectCloseMatrix({ matrix })).toEqual([])
    expect(validateCommittedProjectCloseMatrix({ matrix })).toEqual([])
  })

  it('rejects a structural copy in a committed matrix', () => {
    const matrix = committable()
    const rows = [...matrix.rows]
    rows[0] = Object.freeze({
      ...rows[0]!,
      executionId: rows[0]!.scenario + ':copy:S-2',
    })
    const copied = Object.freeze({ ...matrix, rows: Object.freeze(rows) })
    expect(validateProjectCloseMatrix({ matrix: copied })).toEqual([])
    expect(validateCommittedProjectCloseMatrix({ matrix: copied })).toContain(
      'structural-copy-committed'
    )
  })

  it('rejects a row keyed to a scenario it did not execute', () => {
    const matrix = committable()
    const rows = [...matrix.rows]
    const foreign = rows[1]!
    rows[1] = Object.freeze({
      ...foreign,
      executionId: 'S-3-' + randomUUID(),
    })
    const rekeyed = Object.freeze({ ...matrix, rows: Object.freeze(rows) })
    expect(validateCommittedProjectCloseMatrix({ matrix: rekeyed })).toContain(
      'structural-copy-committed'
    )
  })

  it('requires a receipt on exactly the ten rendered scenarios', () => {
    const missing = committable()
    const withoutReceipt = [...missing.rows].map((row) =>
      row.scenario === 'S-32'
        ? Object.freeze({ ...row, componentWitness: null })
        : row
    )
    expect(
      validateCommittedProjectCloseMatrix({
        matrix: Object.freeze({
          ...missing,
          rows: Object.freeze(withoutReceipt),
        }),
      })
    ).toContain('component-witness-missing')

    const extra = committable()
    const runId = randomUUID()
    const withForeignReceipt = [...extra.rows].map((row) =>
      row.scenario === 'S-1'
        ? Object.freeze({
            ...row,
            componentWitness: witnessFor('S-1', runId),
          })
        : row
    )
    expect(
      validateCommittedProjectCloseMatrix({
        matrix: Object.freeze({
          ...extra,
          rows: Object.freeze(withForeignReceipt),
        }),
      })
    ).toContain('component-witness-missing')
  })

  it('rejects a receipt that does not match its own row or execution', () => {
    for (const corruption of [
      { allPassed: false },
      { scenario: 'S-33' as Bl020ScenarioId },
      { executionId: 'S-32-' + randomUUID() },
      { assertions: 0 },
      { renderedAdmissions: 2 },
      { thenableTransportReturns: 2 },
    ]) {
      const matrix = committable()
      const rows = [...matrix.rows].map((row) =>
        row.scenario === 'S-32'
          ? Object.freeze({
              ...row,
              componentWitness: Object.freeze({
                ...row.componentWitness!,
                ...corruption,
              }),
            })
          : row
      )
      expect(
        validateProjectCloseMatrix({
          matrix: Object.freeze({ ...matrix, rows: Object.freeze(rows) }),
        }),
        JSON.stringify(corruption)
      ).toContain('component-witness-invalid')
    }
  })

  it('requires a complete mutation execution on a committed matrix', () => {
    for (const corruption of [
      null,
      { ...mutationSummary, survived: 1 },
      { ...mutationSummary, killed: BL020_DECLARED_COUNTS.mutations - 1 },
      { ...mutationSummary, executed: BL020_DECLARED_COUNTS.mutations - 1 },
      { ...mutationSummary, baselineViolations: ['scenario-catalog-mismatch'] },
      {
        ...mutationSummary,
        executedBaselineScenarios: ['S-69', 'S-70', 'S-71', 'S-74'],
      },
      {
        ...mutationSummary,
        witnesses: mutationSummary.witnesses.map((witness, index) =>
          index === 0 ? { ...witness, killed: false } : witness
        ),
      },
      {
        ...mutationSummary,
        witnesses: mutationSummary.witnesses.map((witness, index) =>
          index === 3 ? { ...witness, witness: '' } : witness
        ),
      },
    ] as (ProjectCloseMutationSummary | null)[]) {
      const matrix = Object.freeze({
        ...committable(),
        mutations: corruption,
      }) as ProjectCloseMatrix
      expect(
        validateCommittedProjectCloseMatrix({ matrix }),
        JSON.stringify(corruption?.survived ?? 'null')
      ).toContain('mutation-execution-incomplete')
    }
  })
})
