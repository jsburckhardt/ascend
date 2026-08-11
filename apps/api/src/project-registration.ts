import { randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import { access, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { createProjectLibrary, type ProjectLibrary } from './project-library.js'
import type { Project } from './project-persistence.js'

export const REGISTRATION_FAILURE_CATEGORIES = [
  'path_required',
  'unsupported_path_syntax',
  'path_not_found',
  'path_not_directory',
  'path_unreadable',
  'outside_opening_policy',
] as const

export type RegistrationFailureCategory =
  (typeof REGISTRATION_FAILURE_CATEGORIES)[number]

export type RegistrationFailure = {
  category: RegistrationFailureCategory
  field: 'path'
}

export const OPENING_POLICY_FAILURE_CATEGORY = 'invalid_opening_policy' as const
export const REGISTRATION_PATH_FIELD = 'path' as const
export const OPENING_POLICY_CONFIGURED_HOME_FIELD = 'configured_home' as const

export type AllowedRootField = `allowed_roots[${number}]`
export type OpeningPolicyField =
  typeof OPENING_POLICY_CONFIGURED_HOME_FIELD | AllowedRootField

export type OpeningPolicyFailure = {
  category: typeof OPENING_POLICY_FAILURE_CATEGORY
  field: OpeningPolicyField
}

export type RegistrationSuccess = {
  disposition: 'created' | 'existing'
  project: Project
}

export type RegistrationResult = RegistrationSuccess | RegistrationFailure

export interface ProjectRegistrationService {
  register(submittedPath: string): Promise<RegistrationResult>
  close(): void
}

export type ProjectRegistrationConstructionResult =
  | { status: 'ready'; service: ProjectRegistrationService }
  | OpeningPolicyFailure

export interface RegistrationFileInspector {
  canonicalize(inputPath: string): Promise<string>
  inspectDirectory(inputPath: string): Promise<'directory' | 'not_directory'>
  assertReadable(inputPath: string): Promise<void>
}

export interface ProjectRegistrationDependencies {
  readonly fileInspector?: RegistrationFileInspector
  readonly createLibrary?: (databasePath: string) => Promise<ProjectLibrary>
  readonly createId?: () => string
  readonly now?: () => number
}

export interface ProjectRegistrationOptions {
  readonly databasePath: string
  readonly configuredHome: string
  readonly allowedRoots: readonly string[]
}

const nodeFileInspector: RegistrationFileInspector = {
  canonicalize: realpath,
  async inspectDirectory(inputPath) {
    return (await stat(inputPath)).isDirectory() ? 'directory' : 'not_directory'
  },
  async assertReadable(inputPath) {
    await access(inputPath, fsConstants.R_OK | fsConstants.X_OK)
  },
}

function allowedRootField(index: number): AllowedRootField {
  return ('allowed_roots[' + index + ']') as AllowedRootField
}

function configurationFailure(field: OpeningPolicyField): OpeningPolicyFailure {
  return { category: OPENING_POLICY_FAILURE_CATEGORY, field }
}

function registrationFailure(
  category: RegistrationFailureCategory
): RegistrationFailure {
  return { category, field: REGISTRATION_PATH_FIELD }
}

async function validateConfiguredDirectory(
  configuredPath: string,
  inspector: RegistrationFileInspector
): Promise<string | undefined> {
  if (!path.isAbsolute(configuredPath) || configuredPath.includes('\0')) {
    return undefined
  }
  try {
    const canonicalPath = await inspector.canonicalize(configuredPath)
    if ((await inspector.inspectDirectory(canonicalPath)) !== 'directory') {
      return undefined
    }
    await inspector.assertReadable(canonicalPath)
    return canonicalPath
  } catch {
    return undefined
  }
}

function expandSubmittedPath(
  submittedPath: string,
  canonicalHome: string
): string | undefined {
  if (path.isAbsolute(submittedPath)) return submittedPath
  if (submittedPath === '~') return canonicalHome
  if (submittedPath.startsWith('~/')) {
    return path.join(canonicalHome, submittedPath.slice(2))
  }
  return undefined
}

function isWithinOpeningPolicy(
  canonicalPath: string,
  canonicalRoots: readonly string[]
): boolean {
  return canonicalRoots.some((root) => {
    const relative = path.relative(root, canonicalPath)
    return (
      relative === '' ||
      (!path.isAbsolute(relative) &&
        relative !== '..' &&
        !relative.startsWith('..' + path.sep))
    )
  })
}

function classifyFilesystemFailure(
  error: unknown
): RegistrationFailureCategory {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : undefined
  return code === 'ENOENT' || code === 'ENOTDIR'
    ? 'path_not_found'
    : 'path_unreadable'
}

export async function createProjectRegistrationService(
  options: ProjectRegistrationOptions,
  dependencies: ProjectRegistrationDependencies = {}
): Promise<ProjectRegistrationConstructionResult> {
  const inspector = dependencies.fileInspector ?? nodeFileInspector
  const canonicalHome = await validateConfiguredDirectory(
    options.configuredHome,
    inspector
  )
  if (canonicalHome === undefined) {
    return configurationFailure(OPENING_POLICY_CONFIGURED_HOME_FIELD)
  }

  const canonicalRootSet = new Set<string>()
  for (const [index, configuredRoot] of options.allowedRoots.entries()) {
    const canonicalRoot = await validateConfiguredDirectory(
      configuredRoot,
      inspector
    )
    if (canonicalRoot === undefined) {
      return configurationFailure(allowedRootField(index))
    }
    canonicalRootSet.add(canonicalRoot)
  }

  const createLibrary = dependencies.createLibrary ?? createProjectLibrary
  const library = await createLibrary(options.databasePath)
  const canonicalRoots = Object.freeze([...canonicalRootSet])
  const createId = dependencies.createId ?? randomUUID
  const now = dependencies.now ?? Date.now
  let closed = false

  return {
    status: 'ready',
    service: {
      async register(submittedPath) {
        if (submittedPath.trim().length === 0) {
          return registrationFailure('path_required')
        }
        if (submittedPath.includes('\0')) {
          return registrationFailure('unsupported_path_syntax')
        }
        const expandedPath = expandSubmittedPath(submittedPath, canonicalHome)
        if (expandedPath === undefined) {
          return registrationFailure('unsupported_path_syntax')
        }

        let canonicalPath: string
        try {
          canonicalPath = await inspector.canonicalize(expandedPath)
        } catch (error) {
          return registrationFailure(classifyFilesystemFailure(error))
        }

        try {
          if (
            (await inspector.inspectDirectory(canonicalPath)) !== 'directory'
          ) {
            return registrationFailure('path_not_directory')
          }
          await inspector.assertReadable(canonicalPath)
        } catch (error) {
          return registrationFailure(classifyFilesystemFailure(error))
        }

        if (!isWithinOpeningPolicy(canonicalPath, canonicalRoots)) {
          return registrationFailure('outside_opening_policy')
        }

        const basename = path.basename(canonicalPath)
        const candidate: Project = {
          id: createId(),
          name: basename.length === 0 ? canonicalPath : basename,
          canonicalPath,
          createdAt: now(),
        }
        const result = await library.create(candidate)
        if (result.disposition === 'invalid') {
          throw new Error('Project registration generated invalid metadata')
        }
        return result
      },
      close() {
        if (closed) return
        closed = true
        library.close()
      },
    },
  }
}
