/// <reference types="node" />
import { execFile } from 'node:child_process'
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rmdir,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { expect } from 'vitest'

import {
  BL020_CHANGED_FILE_ROLES,
  BL020_PRODUCTION_ENTRYPOINTS,
  BL020_SOURCE_SUFFIXES,
  BL020_VALIDATION_ONLY_MODULES,
  BL020_WRITE_CAPABLE_FS_MEMBERS,
  SELECTED_CLOSE_SOURCE_PATHS,
  buildCloseImportDelta,
  closeImportDeltaAdditions,
  closeImportDeltaWriteCapableAdditions,
  computeCloseImportClosure,
  validateCloseImportDelta,
  type Bl020ChangedFileRole,
  type Bl020ChangeType,
  type Bl020ImportDeltaViolationCode,
  type CloseChangedFileFact,
  type CloseFilesystemCall,
  type CloseFilesystemLedger,
  type CloseImportDelta,
  type CloseImportDeltaEntry,
  type CloseImportDeltaFacts,
  type CloseSourceFileFact,
} from '../src/project-close-evidence.js'
import {
  digest,
  fixtureManifestEntries,
  BL020_FIXTURE_ROOT,
  type FixtureManifestEntry,
} from './project-close-fixtures.js'
import {
  fsInstrumentation,
  REPOSITORY_ROOT,
  type RecordedFsCall,
} from './project-close-fs-ledger.js'
import { resolveBaseSha } from './project-close-source-guards.js'

const run = promisify(execFile)

export const NON_MUTATION_LEDGER_PATH = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-020/close-non-mutation.json'
)

// ---------------------------------------------------------------------------
// Recursive fixture manifests
// ---------------------------------------------------------------------------

export interface FixtureTreePair {
  readonly selected: readonly FixtureManifestEntry[]
  readonly peer: readonly FixtureManifestEntry[]
}

/** Walks both registered fixture trees the scenario observes. */
export async function observeFixtureTrees(input: {
  readonly selectedRoot: string
  readonly peerRoot: string
}): Promise<FixtureTreePair> {
  return {
    selected: await fixtureManifestEntries(input.selectedRoot),
    peer: await fixtureManifestEntries(input.peerRoot),
  }
}

/** What one before/after comparison of one fixture tree actually observed. */
export interface ManifestComparison {
  readonly tree: 'selected' | 'peer'
  readonly membersBefore: number
  readonly membersAfter: number
  readonly digestBefore: string
  readonly digestAfter: string
  readonly equalMembership: boolean
  readonly equalContentDigests: boolean
  readonly equalLinkTargetDigests: boolean
  readonly equalModes: boolean
  readonly equalModificationTimes: boolean
  readonly symbolicLinks: number
  readonly nestedDirectories: number
  readonly nonDefaultModes: number
}

const attribute = <T>(
  entries: readonly FixtureManifestEntry[],
  select: (entry: FixtureManifestEntry) => T
): Record<string, T> =>
  Object.fromEntries(
    entries.map((entry) => [entry.relativePath, select(entry)])
  )

const manifestDigest = (entries: readonly FixtureManifestEntry[]): string =>
  digest(entries.map((entry) => entry.line).join('\n'))

/**
 * Compares two real walks of one fixture tree attribute by attribute:
 * membership, file-content digests, non-dereferenced link-target digests,
 * permission modes, and modification times. Access times are never compared,
 * because reading a tree is not a mutation of it.
 *
 * The shape requirements are asserted on the observed tree rather than on the
 * arrangement that built it: a tree with no link, no nesting, or no
 * distinguishable mode could not witness those attributes being preserved.
 */
export function compareManifests(
  tree: 'selected' | 'peer',
  label: string,
  before: readonly FixtureManifestEntry[],
  after: readonly FixtureManifestEntry[]
): ManifestComparison {
  const where = label + ' ' + tree + ' fixture'
  expect(
    before.length,
    where + ' before manifest is non-empty'
  ).toBeGreaterThan(0)
  expect(before.length, where + ' before manifest is finite').toBeLessThan(
    1_000
  )
  const membership = {
    before: before.map((entry) => entry.relativePath),
    after: after.map((entry) => entry.relativePath),
  }
  expect(membership.after, where + ' membership').toEqual(membership.before)
  expect(
    attribute(after, (entry) => entry.contentDigest),
    where + ' content digests'
  ).toEqual(attribute(before, (entry) => entry.contentDigest))
  expect(
    attribute(after, (entry) => entry.linkTargetDigest),
    where + ' link-target digests'
  ).toEqual(attribute(before, (entry) => entry.linkTargetDigest))
  expect(
    attribute(after, (entry) => entry.mode),
    where + ' permission modes'
  ).toEqual(attribute(before, (entry) => entry.mode))
  expect(
    attribute(after, (entry) => entry.mtimeMs),
    where + ' modification times'
  ).toEqual(attribute(before, (entry) => entry.mtimeMs))

  const symbolicLinks = before.filter((entry) => entry.kind === 'link').length
  const nestedDirectories = before.filter(
    (entry) => entry.kind === 'dir' && entry.relativePath.includes(path.sep)
  ).length
  // The mode a file inherits from the process is whatever the tree's unchmodded
  // file carries, so a "non-default" mode is one that differs from it rather
  // than one compared against a restated constant.
  const inherited = before.find(
    (entry) => entry.kind === 'file' && entry.relativePath === 'README.md'
  )?.mode
  const nonDefaultModes = before.filter(
    (entry) => entry.kind === 'file' && entry.mode !== inherited
  ).length
  expect(symbolicLinks, where + ' symbolic links').toBeGreaterThan(0)
  expect(nestedDirectories, where + ' nested directories').toBeGreaterThan(0)
  expect(nonDefaultModes, where + ' non-default modes').toBeGreaterThan(0)

  return Object.freeze({
    tree,
    membersBefore: before.length,
    membersAfter: after.length,
    digestBefore: manifestDigest(before),
    digestAfter: manifestDigest(after),
    equalMembership: true,
    equalContentDigests: true,
    equalLinkTargetDigests: true,
    equalModes: true,
    equalModificationTimes: true,
    symbolicLinks,
    nestedDirectories,
    nonDefaultModes,
  })
}

// ---------------------------------------------------------------------------
// The executed `G-15` ledger
// ---------------------------------------------------------------------------

/** The application source trees; a call from one of them is the product's. */
const PRODUCT_SOURCE_PREFIXES = Object.freeze([
  'apps/api/src/',
  'apps/web/src/',
])

export const isProductModule = (origin: string | null): boolean =>
  origin !== null &&
  PRODUCT_SOURCE_PREFIXES.some((prefix) => origin.startsWith(prefix)) &&
  !/\.test\.[cm]?[jt]sx?$/u.test(origin)

/** The runtime's own ephemeral data root, derived from the delivered path. */
export const runtimeEphemeralRoot = (userDataPath: string): string =>
  path.dirname(userDataPath)

export interface LedgerInputs {
  readonly calls: readonly RecordedFsCall[]
  readonly registeredProjectRoots: readonly string[]
  readonly permittedRoots: readonly string[]
}

/** Assembles the executed `G-15` ledger from what the window recorded. */
export function buildFilesystemLedger(
  inputs: LedgerInputs
): CloseFilesystemLedger {
  const calls: readonly CloseFilesystemCall[] = Object.freeze(
    inputs.calls.map((call) =>
      Object.freeze({
        member: call.member,
        path: call.path,
        writeCapable: call.writeCapable,
        origin: call.origin,
        productModule: isProductModule(call.origin),
      })
    )
  )
  return Object.freeze({
    calls,
    registeredProjectRoots: Object.freeze([...inputs.registeredProjectRoots]),
    permittedRoots: Object.freeze([...inputs.permittedRoots]),
    instrumented: fsInstrumentation().length > 0,
    instrumentation: Object.freeze(
      fsInstrumentation().map((record) =>
        Object.freeze({
          module: record.module,
          available: record.available,
          instrumented: record.instrumented,
        })
      )
    ),
  })
}

const under = (candidate: string, root: string): boolean =>
  candidate === root || candidate.startsWith(root + path.sep)

/** The public-safe account of one executed ledger. */
export interface LedgerReport {
  readonly observedCalls: number
  readonly writeCapableCalls: number
  readonly productModuleCalls: number
  readonly members: readonly string[]
  readonly familyCounts: Readonly<Record<string, number>>
  readonly insideRegisteredRoot: number
  readonly outsideEveryRegisteredRoot: boolean
  readonly permittedRootsOutsideRegisteredRoots: boolean
  readonly instrumentedModules: readonly string[]
  readonly instrumentedMembers: number
  readonly origins: readonly string[]
}

export const FAMILY_NAMES = Object.freeze({
  runtime: 'runtime-ephemeral',
  database: 'isolated-database',
  registered: 'registered-project-root',
  other: 'outside-declared-families',
} as const)

/**
 * Reduces a ledger to what a report may carry. Paths never leave this
 * function: only members, families, origins, counts, and the relations the
 * guard decided on are published.
 */
export function reportLedger(
  ledger: CloseFilesystemLedger,
  families: { readonly runtime: string; readonly database: string }
): LedgerReport {
  const writeCapable = ledger.calls.filter((call) => call.writeCapable)
  const familyCounts: Record<string, number> = {
    [FAMILY_NAMES.runtime]: 0,
    [FAMILY_NAMES.database]: 0,
    [FAMILY_NAMES.registered]: 0,
    [FAMILY_NAMES.other]: 0,
  }
  let inside = 0
  for (const call of writeCapable) {
    const registered = ledger.registeredProjectRoots.some((root) =>
      under(call.path, root)
    )
    if (registered) inside += 1
    const family = registered
      ? FAMILY_NAMES.registered
      : under(call.path, families.runtime)
        ? FAMILY_NAMES.runtime
        : under(call.path, families.database)
          ? FAMILY_NAMES.database
          : FAMILY_NAMES.other
    familyCounts[family] = (familyCounts[family] ?? 0) + 1
  }
  return Object.freeze({
    observedCalls: ledger.calls.length,
    writeCapableCalls: writeCapable.length,
    productModuleCalls: writeCapable.filter(
      (call) => call.productModule === true
    ).length,
    members: Object.freeze(
      [...new Set(writeCapable.map((call) => call.member))].sort()
    ),
    familyCounts: Object.freeze(familyCounts),
    insideRegisteredRoot: inside,
    outsideEveryRegisteredRoot: inside === 0,
    permittedRootsOutsideRegisteredRoots: ledger.permittedRoots.every(
      (permitted) =>
        !ledger.registeredProjectRoots.some((root) => under(permitted, root))
    ),
    instrumentedModules: Object.freeze(
      ledger.instrumentation.map((record) => record.module).sort()
    ),
    instrumentedMembers: new Set(
      ledger.instrumentation.flatMap((record) => record.instrumented)
    ).size,
    origins: Object.freeze(
      [
        ...new Set(
          writeCapable
            .map((call) => call.origin)
            .filter((origin): origin is string => origin !== null)
        ),
      ].sort()
    ),
  })
}

// ---------------------------------------------------------------------------
// The executed `G-23` import delta
// ---------------------------------------------------------------------------

const git = async (args: readonly string[]): Promise<string> => {
  const { stdout } = await run('git', [...args], {
    cwd: REPOSITORY_ROOT,
    maxBuffer: 128 * 1024 * 1024,
  })
  return stdout
}

const nulSeparated = (text: string): readonly string[] =>
  text.split('\0').filter((entry) => entry.length > 0)

/**
 * The repository files the closure is walked over. The change set itself is
 * restricted to the frozen source suffixes; a stylesheet is indexed because a
 * deployed entry point reaches one by a bare side-effect import, and dropping
 * it would hide a real edge of the import graph.
 */
const INDEXED_SUFFIXES = Object.freeze([...BL020_SOURCE_SUFFIXES, '.css'])

const isSource = (file: string): boolean =>
  BL020_SOURCE_SUFFIXES.some((suffix) => file.endsWith(suffix))

const isIndexed = (file: string): boolean =>
  INDEXED_SUFFIXES.some((suffix) => file.endsWith(suffix))

/** One measured change-set member before its base text has been read. */
export type CloseChangedFileRecord = Omit<CloseChangedFileFact, 'baseText'>

/**
 * Every source file the change set adds, modifies, or renames against the
 * base, plus every untracked non-ignored source file. Renames are detected, so
 * a moved file records the path it moved **from** and is compared against it
 * rather than being mistaken for an addition.
 */
export async function measureChangedSourceFiles(
  baseSha: string
): Promise<readonly CloseChangedFileRecord[]> {
  const fields = nulSeparated(
    await git([
      'diff',
      '--name-status',
      '-z',
      '-M',
      '--diff-filter=ACMR',
      baseSha,
    ])
  )
  const records = new Map<string, CloseChangedFileRecord>()
  const record = (candidate: CloseChangedFileRecord): void => {
    if (isSource(candidate.file)) records.set(candidate.file, candidate)
  }
  let cursor = 0
  while (cursor < fields.length) {
    const status = fields[cursor++] ?? ''
    if (status.startsWith('R') || status.startsWith('C')) {
      const from = fields[cursor++] ?? ''
      const to = fields[cursor++] ?? ''
      record({ file: to, changeType: 'renamed', basePath: from })
      continue
    }
    const file = fields[cursor++] ?? ''
    record(
      status === 'A'
        ? { file, changeType: 'added', basePath: null }
        : { file, changeType: 'modified', basePath: file }
    )
  }
  for (const file of nulSeparated(
    await git(['ls-files', '--others', '--exclude-standard', '-z'])
  ))
    record({ file, changeType: 'added', basePath: null })
  return Object.freeze(
    [...records.values()].sort((left, right) =>
      left.file < right.file ? -1 : left.file > right.file ? 1 : 0
    )
  )
}

/**
 * Reads each measured file's base-revision text from the path it is compared
 * against — the **pre-rename** path for a rename — through `git show`, without
 * checking out or reverting anything. An addition carries no base path and is
 * measured against an empty import set; a base text that does not resolve is
 * reported as unresolved rather than silently treated as an addition.
 */
export async function readCensusBaseTexts(
  baseSha: string,
  records: readonly CloseChangedFileRecord[]
): Promise<readonly CloseChangedFileFact[]> {
  const facts: CloseChangedFileFact[] = []
  for (const candidate of records) {
    if (candidate.basePath === null) {
      facts.push(Object.freeze({ ...candidate, baseText: null }))
      continue
    }
    let baseText: string | null = null
    try {
      baseText = await git(['show', baseSha + ':' + candidate.basePath])
    } catch {
      baseText = null
    }
    facts.push(Object.freeze({ ...candidate, baseText }))
  }
  return Object.freeze(facts)
}

/** Every indexed repository file at the branch head, tracked and untracked. */
export async function readRepositorySources(): Promise<
  readonly CloseSourceFileFact[]
> {
  const deleted = new Set(
    nulSeparated(await git(['ls-files', '--deleted', '-z']))
  )
  const listed = [
    ...nulSeparated(await git(['ls-files', '-z'])),
    ...nulSeparated(
      await git(['ls-files', '--others', '--exclude-standard', '-z'])
    ),
  ]
  const files = [...new Set(listed)]
    .filter((file) => isIndexed(file) && !deleted.has(file))
    .sort()
  const sources = await Promise.all(
    files.map(async (file) =>
      Object.freeze({
        file,
        text: await readFile(path.join(REPOSITORY_ROOT, file), 'utf8'),
      })
    )
  )
  return Object.freeze(sources)
}

/**
 * The facts `G-23` measures: the base revision, the frozen entry points, every
 * indexed repository source, and the independently measured change-set census
 * with its base texts. Nothing here decides governance — the closure, the
 * roles, and the governed scope are all derived from these by the contract.
 */
export async function collectImportDeltaFacts(): Promise<CloseImportDeltaFacts> {
  const baseSha = await resolveBaseSha()
  const [sources, census] = await Promise.all([
    readRepositorySources(),
    measureChangedSourceFiles(baseSha).then((records) =>
      readCensusBaseTexts(baseSha, records)
    ),
  ])
  return Object.freeze({
    baseSha,
    entryPoints: Object.freeze([...BL020_PRODUCTION_ENTRYPOINTS]),
    sources,
    census,
  })
}

/** Measures the executed delta from the repository's own facts. */
export async function measureImportDelta(): Promise<CloseImportDelta> {
  return buildCloseImportDelta(await collectImportDeltaFacts())
}

// ---------------------------------------------------------------------------
// The `G-23` negative controls
// ---------------------------------------------------------------------------

/**
 * One injected corruption, the code it must be rejected by, and the exact set
 * of codes it produces. A control either corrupts the **facts** and rebuilds —
 * proving the guard measures the repository — or corrupts a **claim** of an
 * honestly built delta, proving no claim can widen or narrow the guard's scope.
 */
export interface ImportDeltaControl {
  readonly name: string
  readonly code: Bl020ImportDeltaViolationCode
  readonly expected: readonly Bl020ImportDeltaViolationCode[]
  readonly corrupt: (
    facts: CloseImportDeltaFacts,
    delta: CloseImportDelta
  ) => CloseImportDelta
}

const CONTROL_ADDED_WRITER = 'apps/api/src/bl020-import-delta-control.ts'
const CONTROL_BARE_MODULE = 'apps/api/src/bl020-bare-import-control.ts'
const CONTROL_UNRATIFIED_MODULE = 'apps/api/src/bl020-unratified-control.ts'
const CONTROL_CLI_MODULE = 'apps/api/src/cli/bl020-cli-control.ts'
const API_ENTRY_POINT = BL020_PRODUCTION_ENTRYPOINTS[0]

/**
 * The grammar the delivered `T-14` walk used: `from '…'` in single quotes
 * only. It drops every bare side-effect import, so a production module
 * reachable only that way escapes the governed scope entirely.
 */
export const NARROW_FROM_ONLY_GRAMMAR = (source: string): readonly string[] =>
  Object.freeze(
    [...source.matchAll(/from\s*'([^']+)'/gu)].map((match) => match[1] ?? '')
  )

const sourceText = (facts: CloseImportDeltaFacts, file: string): string => {
  const source = facts.sources.find((candidate) => candidate.file === file)
  if (source === undefined)
    throw new Error('BL-020 G-23 control has no source for ' + file)
  return source.text
}

const withSource = (
  facts: CloseImportDeltaFacts,
  file: string,
  text: string
): CloseImportDeltaFacts =>
  Object.freeze({
    ...facts,
    sources: Object.freeze([
      ...facts.sources.filter((candidate) => candidate.file !== file),
      Object.freeze({ file, text }),
    ]),
  })

const withCensus = (
  facts: CloseImportDeltaFacts,
  fact: CloseChangedFileFact
): CloseImportDeltaFacts =>
  Object.freeze({
    ...facts,
    census: Object.freeze([
      ...facts.census.filter((candidate) => candidate.file !== fact.file),
      Object.freeze(fact),
    ]),
  })

/** Adds a module the API entry point reaches only by a bare side-effect import. */
const withBareImportedModule = (
  facts: CloseImportDeltaFacts,
  file: string,
  text: string
): CloseImportDeltaFacts =>
  withCensus(
    withSource(
      withSource(facts, file, text),
      API_ENTRY_POINT,
      sourceText(facts, API_ENTRY_POINT) +
        "\nimport './" +
        file.slice('apps/api/src/'.length).replace(/\.ts$/u, '.js') +
        "'\n"
    ),
    { file, changeType: 'added', basePath: null, baseText: null }
  )

const mapEntry = (
  delta: CloseImportDelta,
  file: string,
  change: Partial<CloseImportDeltaEntry>
): CloseImportDelta => {
  if (!delta.entries.some((entry) => entry.file === file))
    throw new Error('BL-020 G-23 control has no measured entry for ' + file)
  return Object.freeze({
    ...delta,
    entries: Object.freeze(
      delta.entries.map((entry) =>
        entry.file === file ? Object.freeze({ ...entry, ...change }) : entry
      )
    ),
  })
}

/** A changed file that is measured, exempt, and absent at the base. */
const anyValidationEntry = (delta: CloseImportDelta): string => {
  const entry = delta.entries.find(
    (candidate) =>
      candidate.role === 'validation-harness' && !candidate.presentAtBase
  )
  if (entry === undefined)
    throw new Error('BL-020 G-23 measured no added validation-harness file')
  return entry.file
}

export const IMPORT_DELTA_CONTROLS: readonly ImportDeltaControl[] =
  Object.freeze([
    {
      name: 'a write-capable import injected into the governed proxy manager',
      code: 'governed-write-capable-import-added',
      expected: ['governed-write-capable-import-added'],
      corrupt: (facts) =>
        buildCloseImportDelta(
          withSource(
            facts,
            SELECTED_CLOSE_SOURCE_PATHS.proxyManager,
            "import { writeFile } from 'node:fs/promises'\n" +
              sourceText(facts, SELECTED_CLOSE_SOURCE_PATHS.proxyManager)
          )
        ),
    },
    {
      name: 'a write-capable import in a governed file absent at the base, reached only by a bare side-effect import',
      code: 'governed-write-capable-import-added',
      expected: ['governed-write-capable-import-added'],
      corrupt: (facts) =>
        buildCloseImportDelta(
          withBareImportedModule(
            facts,
            CONTROL_ADDED_WRITER,
            "import { writeFile } from 'node:fs/promises'\nexport const control = writeFile\n"
          )
        ),
    },
    {
      name: 'the changed close service relabelled validation-harness',
      code: 'selected-source-degoverned',
      expected: ['selected-source-degoverned', 'role-misclassified'],
      corrupt: (_facts, delta) =>
        mapEntry(delta, SELECTED_CLOSE_SOURCE_PATHS.closeService, {
          role: 'validation-harness',
        }),
    },
    {
      name: 'the changed close service marked ungoverned',
      code: 'selected-source-degoverned',
      expected: [
        'selected-source-degoverned',
        'role-misclassified',
        'governed-scope-reduced',
      ],
      corrupt: (_facts, delta) =>
        mapEntry(delta, SELECTED_CLOSE_SOURCE_PATHS.closeService, {
          governed: false,
        }),
    },
    {
      name: 'a changed file dropped from the measured entry list',
      code: 'changed-file-unmeasured',
      expected: ['changed-file-unmeasured'],
      corrupt: (_facts, delta) => {
        const dropped = anyValidationEntry(delta)
        return Object.freeze({
          ...delta,
          entries: Object.freeze(
            delta.entries.filter((entry) => entry.file !== dropped)
          ),
        })
      },
    },
    {
      name: 'the same changed file measured twice',
      code: 'changed-file-unmeasured',
      expected: ['changed-file-unmeasured'],
      corrupt: (_facts, delta) => {
        const duplicated = delta.entries[0]
        if (duplicated === undefined)
          throw new Error('BL-020 G-23 measured no entry to duplicate')
        return Object.freeze({
          ...delta,
          entries: Object.freeze([...delta.entries, duplicated]),
        })
      },
    },
    {
      name: 'an existing governed file marked absent at the base',
      code: 'base-comparison-incomplete',
      expected: ['base-comparison-incomplete'],
      corrupt: (_facts, delta) =>
        mapEntry(delta, SELECTED_CLOSE_SOURCE_PATHS.runtimeManager, {
          presentAtBase: false,
        }),
    },
    {
      name: 'an added file given a non-empty base member set',
      code: 'base-comparison-incomplete',
      expected: ['base-comparison-incomplete'],
      corrupt: (_facts, delta) =>
        mapEntry(delta, anyValidationEntry(delta), {
          baseMembers: Object.freeze(['writeFile']),
        }),
    },
    {
      name: 'a renamed governed file whose pre-rename base text did not resolve',
      code: 'base-comparison-incomplete',
      expected: ['base-comparison-incomplete'],
      corrupt: (facts) =>
        buildCloseImportDelta(
          withCensus(facts, {
            file: SELECTED_CLOSE_SOURCE_PATHS.projectsRoute,
            changeType: 'renamed',
            basePath: 'apps/api/src/routes/projects-before-the-rename.ts',
            baseText: null,
          })
        ),
    },
    {
      name: 'the changed API application module relabelled validation-harness',
      code: 'role-misclassified',
      expected: ['selected-source-degoverned', 'role-misclassified'],
      corrupt: (_facts, delta) =>
        mapEntry(delta, SELECTED_CLOSE_SOURCE_PATHS.app, {
          role: 'validation-harness',
        }),
    },
    {
      name: 'a governed module outside the selected set relabelled validation-harness',
      code: 'role-misclassified',
      expected: ['role-misclassified'],
      corrupt: (_facts, delta) => {
        const selected = new Set<string>(
          Object.values(SELECTED_CLOSE_SOURCE_PATHS)
        )
        const governed = delta.entries.find(
          (entry) => entry.governed && !selected.has(entry.file)
        )
        if (governed === undefined)
          throw new Error('BL-020 G-23 measured no governed non-selected file')
        return mapEntry(delta, governed.file, { role: 'validation-harness' })
      },
    },
    {
      name: 'a changed unratified non-test module under src/',
      code: 'role-misclassified',
      expected: ['role-misclassified'],
      corrupt: (facts) =>
        buildCloseImportDelta(
          withCensus(
            withSource(
              facts,
              CONTROL_UNRATIFIED_MODULE,
              'export const control = true\n'
            ),
            {
              file: CONTROL_UNRATIFIED_MODULE,
              changeType: 'added',
              basePath: null,
              baseText: null,
            }
          )
        ),
    },
    {
      // `apps/api/src/cli/` is not a directory-wide exemption: only the exact
      // ratified residual-audit module is validation-only, so a second CLI
      // module cannot inherit its exemption from its location.
      name: 'a second unratified module beside the exempt residual-audit CLI',
      code: 'role-misclassified',
      expected: ['role-misclassified'],
      corrupt: (facts) =>
        buildCloseImportDelta(
          withCensus(
            withSource(
              facts,
              CONTROL_CLI_MODULE,
              "import { writeFile } from 'node:fs/promises'\nexport const control = writeFile\n"
            ),
            {
              file: CONTROL_CLI_MODULE,
              changeType: 'added',
              basePath: null,
              baseText: null,
            }
          )
        ),
    },
    {
      name: 'an exempt evidence module injected into the supplied closure',
      code: 'validation-module-executable',
      expected: ['validation-module-executable'],
      corrupt: (_facts, delta) =>
        Object.freeze({
          ...delta,
          closure: Object.freeze(
            [...delta.closure, BL020_VALIDATION_ONLY_MODULES[1]].sort()
          ),
        }),
    },
    {
      name: 'an exempt evidence module made reachable from the API application',
      code: 'validation-module-executable',
      expected: ['validation-module-executable'],
      corrupt: (facts) =>
        buildCloseImportDelta(
          withSource(
            facts,
            SELECTED_CLOSE_SOURCE_PATHS.app,
            sourceText(facts, SELECTED_CLOSE_SOURCE_PATHS.app) +
              "\nimport './project-close-evidence.js'\n"
          )
        ),
    },
    {
      name: 'a supplied closure with the runtime manager removed',
      code: 'governed-scope-reduced',
      expected: ['governed-scope-reduced'],
      corrupt: (_facts, delta) =>
        Object.freeze({
          ...delta,
          closure: Object.freeze(
            delta.closure.filter(
              (member) => member !== SELECTED_CLOSE_SOURCE_PATHS.runtimeManager
            )
          ),
        }),
    },
    {
      name: 'a closure computed by a grammar that recognises only from-specifiers',
      code: 'governed-scope-reduced',
      expected: ['governed-scope-reduced'],
      corrupt: (facts) => {
        const reachable = withBareImportedModule(
          facts,
          CONTROL_BARE_MODULE,
          'export const control = true\n'
        )
        const delta = buildCloseImportDelta(reachable)
        return Object.freeze({
          ...delta,
          closure: computeCloseImportClosure(
            reachable.sources,
            reachable.entryPoints,
            NARROW_FROM_ONLY_GRAMMAR
          ),
        })
      },
    },
    {
      name: 'an entry-point list narrowed to the API entry alone',
      code: 'governed-scope-reduced',
      expected: ['governed-scope-reduced'],
      corrupt: (_facts, delta) =>
        Object.freeze({
          ...delta,
          entryPoints: Object.freeze([API_ENTRY_POINT]),
        }),
    },
  ])

/** One executed control row, as the retained artifact publishes it. */
export interface ImportDeltaControlOutcome {
  readonly control: string
  readonly designatedCode: Bl020ImportDeltaViolationCode
  readonly violations: readonly string[]
  readonly detected: boolean
}

/**
 * Executes every negative control and returns what each produced. Each row is
 * asserted by its suite; the outcomes are published so the control table is
 * auditable rather than merely claimed.
 */
export function runImportDeltaControls(
  facts: CloseImportDeltaFacts,
  delta: CloseImportDelta
): readonly ImportDeltaControlOutcome[] {
  return Object.freeze(
    IMPORT_DELTA_CONTROLS.map((control) => {
      const violations = validateCloseImportDelta(control.corrupt(facts, delta))
      return Object.freeze({
        control: control.name,
        designatedCode: control.code,
        violations,
        detected: violations.includes(control.code),
      })
    })
  )
}

// ---------------------------------------------------------------------------
// The public-safe import-delta report
// ---------------------------------------------------------------------------

export interface ImportDeltaFileReport {
  readonly file: string
  readonly changeType: Bl020ChangeType
  readonly basePath: string | null
  readonly presentAtBase: boolean
  readonly baseTextResolved: boolean
  readonly role: Bl020ChangedFileRole
  readonly governed: boolean
  readonly added: readonly string[]
  readonly addedWriteCapable: readonly string[]
}

export interface ImportDeltaReport {
  readonly baseSha: string
  readonly entryPoints: readonly string[]
  readonly closureSize: number
  readonly closure: readonly string[]
  readonly changedFiles: number
  readonly renamedFiles: number
  readonly filesAbsentAtBase: number
  readonly baseComparisonsResolved: number
  readonly governedFiles: number
  readonly governedSelectedSources: number
  readonly roleTotals: Readonly<Record<Bl020ChangedFileRole, number>>
  readonly validationOnlyModulesInClosure: number
  readonly writeCapableMembers: number
  readonly governedWriteCapableAdditions: number
  readonly governedScope: readonly string[]
  readonly files: readonly ImportDeltaFileReport[]
}

/**
 * The public-safe import-delta report: repository-relative paths, computed
 * roles, and member names only. **Every** measured file is reported, governed
 * and exempt alike, so the exempt set stays visible and auditable. Every count
 * here is a witness of this branch, never a declared constant.
 */
export function reportImportDelta(delta: CloseImportDelta): ImportDeltaReport {
  const selected = new Set<string>(Object.values(SELECTED_CLOSE_SOURCE_PATHS))
  const files = delta.entries.map((entry) =>
    Object.freeze({
      file: entry.file,
      changeType: entry.changeType,
      basePath: entry.basePath,
      presentAtBase: entry.presentAtBase,
      baseTextResolved: entry.baseTextResolved,
      role: entry.role,
      governed: entry.governed,
      added: closeImportDeltaAdditions(entry),
      addedWriteCapable: closeImportDeltaWriteCapableAdditions(entry),
    })
  )
  const roleTotals = Object.fromEntries(
    BL020_CHANGED_FILE_ROLES.map((role) => [
      role,
      files.filter((entry) => entry.role === role).length,
    ])
  ) as Record<Bl020ChangedFileRole, number>
  const closure = new Set(delta.closure)
  return Object.freeze({
    baseSha: delta.baseSha,
    entryPoints: Object.freeze([...delta.entryPoints]),
    closureSize: delta.closure.length,
    closure: Object.freeze([...delta.closure]),
    changedFiles: files.length,
    renamedFiles: files.filter((entry) => entry.changeType === 'renamed')
      .length,
    filesAbsentAtBase: files.filter((entry) => !entry.presentAtBase).length,
    baseComparisonsResolved: files.filter(
      (entry) => entry.presentAtBase === entry.baseTextResolved
    ).length,
    governedFiles: files.filter((entry) => entry.governed).length,
    governedSelectedSources: files.filter(
      (entry) => entry.governed && selected.has(entry.file)
    ).length,
    roleTotals: Object.freeze(roleTotals),
    validationOnlyModulesInClosure: BL020_VALIDATION_ONLY_MODULES.filter(
      (module) => closure.has(module)
    ).length,
    writeCapableMembers: BL020_WRITE_CAPABLE_FS_MEMBERS.length,
    governedWriteCapableAdditions: files.filter(
      (entry) => entry.governed && entry.addedWriteCapable.length > 0
    ).length,
    governedScope: Object.freeze([...delta.governedScope]),
    files: Object.freeze(files),
  })
}

// ---------------------------------------------------------------------------
// The retained report
// ---------------------------------------------------------------------------

/**
 * Fails when a serialized report carries a value only this host could know:
 * a repository or temporary path, a process identifier, a loopback authority,
 * or any raw host value the run itself created.
 */
export function assertPublicSafe(
  serialized: string,
  hostValues: readonly string[]
): void {
  for (const value of [REPOSITORY_ROOT, os.tmpdir(), os.homedir()])
    expect(serialized, 'report withholds host roots').not.toContain(value)
  for (const value of hostValues)
    if (value.length > 0)
      expect(serialized, 'report withholds created host values').not.toContain(
        value
      )
  expect(serialized).not.toMatch(/127\.0\.0\.1|localhost:\d|:\d{4,5}\b/u)
  expect(serialized).not.toMatch(/"pid"|\bat \/|Error:|\bstack\b/u)
  expect(serialized).not.toMatch(/\.sqlite|\.db\b/u)
}

/** Writes the report through a staged rename, so no partial file is left. */
export async function retainReport(
  destination: string,
  serialized: string
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  const staged = destination + '.staged'
  await writeFile(staged, serialized)
  await rename(staged, destination)
}

/**
 * Removes the empty per-scenario directories this lane's worlds created under
 * the worker's fixture root. A directory that still holds an entry belongs to
 * something still running and is left untouched.
 */
export async function scenarioFixtureShells(
  scenarios: readonly string[]
): Promise<void> {
  for (const scenario of scenarios) {
    const shell = path.join(BL020_FIXTURE_ROOT, scenario.toLowerCase())
    let entries: readonly string[]
    try {
      entries = await readdir(shell)
    } catch {
      continue
    }
    if (entries.length === 0) await rmdir(shell)
  }
}
