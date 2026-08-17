/// <reference types="node" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BL020_WRITE_CAPABLE_FS_MEMBERS } from '../src/project-close-evidence.js'

/**
 * The two module boundaries `G-15` instruments. Every close-reachable module
 * reaches the filesystem through one of them, so wrapping both namespaces is
 * what makes the guard an observation of executed calls rather than a reading
 * of source text.
 */
export const BL020_INSTRUMENTED_FS_MODULES = Object.freeze([
  'node:fs',
  'node:fs/promises',
] as const)
export type InstrumentedFsModule =
  (typeof BL020_INSTRUMENTED_FS_MODULES)[number]

export const REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
)

export interface RecordedFsCall {
  readonly member: string
  readonly module: InstrumentedFsModule
  /** The resolved absolute path argument the call received. */
  readonly path: string
  readonly writeCapable: boolean
  /**
   * The repository-relative module that made the call, recovered from the
   * call site. `null` when the caller lies outside the repository. It is used
   * to prove the instrumentation observes product modules and never to
   * publish a host path or a stack.
   */
  readonly origin: string | null
}

interface InstrumentationRecord {
  readonly module: InstrumentedFsModule
  /** Frozen write-capable members the module actually exposes. */
  readonly available: readonly string[]
  /** Frozen write-capable members this instrumentation wrapped. */
  readonly instrumented: readonly string[]
}

const records = new Map<InstrumentedFsModule, InstrumentationRecord>()
const open: RecordedFsCall[][] = []

/** Records the instrumented modules, in the order they were wrapped. */
export const fsInstrumentation = (): readonly InstrumentationRecord[] =>
  Object.freeze([...records.values()])

export interface FsWindow {
  /** Closes the window and returns exactly what it observed. */
  close(): readonly RecordedFsCall[]
}

/**
 * Opens a recording window. Only calls made while a window is open are
 * recorded, so a ledger covers the close execution boundary and never the
 * fixture arrangement or the validation cleanup around it.
 */
export function openFsWindow(): FsWindow {
  const calls: RecordedFsCall[] = []
  open.push(calls)
  let closed = false
  return {
    close() {
      if (closed) throw new Error('BL-020 filesystem window closed twice')
      closed = true
      const index = open.indexOf(calls)
      if (index < 0) throw new Error('BL-020 filesystem window went missing')
      open.splice(index, 1)
      return Object.freeze([...calls])
    },
  }
}

const isPathLike = (value: unknown): boolean =>
  typeof value === 'string' ||
  value instanceof URL ||
  (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))

/**
 * The members whose second argument is also a filesystem location the call
 * acts on. Every other member's second argument is data, a mode, or an option
 * bag, and recording it as a path would invent calls the process never made.
 */
const SECOND_PATH_ARGUMENT = Object.freeze({
  link: true,
  rename: true,
  copyFile: true,
  cp: true,
  // `symlink(target, path)` creates `path`; its target is a string stored in
  // the link rather than a location this call touches.
  symlink: 'only',
} as const)

function resolvePath(value: unknown): string | null {
  if (typeof value === 'string')
    return value.startsWith('file:')
      ? fileURLToPath(value)
      : path.resolve(value)
  if (value instanceof URL)
    return value.protocol === 'file:' ? fileURLToPath(value) : value.href
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))
    return path.resolve(value.toString('utf8'))
  return null
}

/**
 * `open` is write-capable only when its flags request writing. A missing flag
 * argument is the platform default `r`, which cannot mutate anything.
 */
function openIsWriteCapable(flags: unknown): boolean {
  if (flags === undefined || flags === null) return false
  if (typeof flags === 'number') {
    // O_WRONLY | O_RDWR | O_CREAT | O_TRUNC | O_APPEND, by their POSIX values.
    return (flags & (1 | 2 | 64 | 512 | 1024)) !== 0
  }
  if (typeof flags === 'string') return /[wa+]/u.test(flags)
  if (typeof flags === 'object') {
    const candidate = (flags as { flags?: unknown }).flags
    return candidate === undefined ? false : openIsWriteCapable(candidate)
  }
  return false
}

/** The first call-site frame outside this module, as a repository path. */
function callOrigin(): string | null {
  const stack = new Error().stack ?? ''
  for (const line of stack.split('\n').slice(1)) {
    const match =
      /\(?((?:\/|file:\/\/)[^):]+\.(?:ts|tsx|mts|cts|js|mjs|cjs))(?::\d+)?(?::\d+)?\)?$/u.exec(
        line.trim()
      )
    const raw = match?.[1]
    if (raw === undefined) continue
    const absolute = raw.startsWith('file:') ? fileURLToPath(raw) : raw
    if (absolute.endsWith('project-close-fs-ledger.ts')) continue
    if (!absolute.startsWith(REPOSITORY_ROOT + path.sep)) continue
    if (absolute.includes('node_modules')) continue
    return path.relative(REPOSITORY_ROOT, absolute)
  }
  return null
}

function record(
  module: InstrumentedFsModule,
  member: string,
  args: readonly unknown[]
): void {
  if (open.length === 0) return
  const writeCapable = member === 'open' ? openIsWriteCapable(args[1]) : true
  const second = (SECOND_PATH_ARGUMENT as Record<string, unknown>)[member]
  const positions =
    second === 'only'
      ? [args[1]]
      : second === true
        ? [args[0], args[1]]
        : [args[0]]
  const paths = positions
    .filter(isPathLike)
    .map(resolvePath)
    .filter((value): value is string => value !== null)
  if (paths.length === 0) return
  const origin = callOrigin()
  for (const calls of open)
    for (const observed of paths)
      calls.push(
        Object.freeze({
          member,
          module,
          path: observed,
          writeCapable,
          origin,
        })
      )
}

type Namespace = Record<string, unknown>

function wrap(
  actual: Namespace,
  module: InstrumentedFsModule
): { readonly namespace: Namespace; readonly instrumented: readonly string[] } {
  const namespace: Namespace = { ...actual }
  const instrumented: string[] = []
  for (const member of BL020_WRITE_CAPABLE_FS_MEMBERS) {
    const original = actual[member]
    if (typeof original !== 'function') continue
    instrumented.push(member)
    namespace[member] = function instrumentedMember(
      this: unknown,
      ...args: unknown[]
    ): unknown {
      record(module, member, args)
      return (original as (...input: unknown[]) => unknown).apply(this, args)
    }
  }
  return { namespace, instrumented: Object.freeze(instrumented) }
}

/**
 * Wraps one filesystem module namespace so every write-capable call it serves
 * is recorded before it is delegated, unchanged, to the real implementation.
 * The default export and the `promises` sub-namespace are wrapped too, so a
 * module that reaches the filesystem through either is observed as well.
 */
export function instrumentFsModule(
  actual: Namespace,
  module: InstrumentedFsModule
): Namespace {
  const { namespace, instrumented } = wrap(actual, module)
  const available = BL020_WRITE_CAPABLE_FS_MEMBERS.filter(
    (member) => typeof actual[member] === 'function'
  )
  records.set(module, Object.freeze({ module, available, instrumented }))
  const promises = actual['promises']
  if (promises !== undefined && promises !== null)
    namespace['promises'] = wrap(
      promises as Namespace,
      'node:fs/promises'
    ).namespace
  const fallback = actual['default']
  const defaults =
    fallback === undefined || fallback === null
      ? namespace
      : {
          ...wrap(fallback as Namespace, module).namespace,
          ...(typeof (fallback as Namespace)['promises'] === 'object'
            ? {
                promises: wrap(
                  (fallback as Namespace)['promises'] as Namespace,
                  'node:fs/promises'
                ).namespace,
              }
            : {}),
        }
  namespace['default'] = defaults
  return namespace
}
