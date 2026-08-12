export interface RuntimeManagerSourceGuardReport {
  readonly accepted: boolean
  readonly violations: readonly string[]
}

const forbiddenStateMapName =
  /(?:const|let|private|readonly)\s+(?:inFlight|running|failed|runtimeByPath|runtimeByName|projectRuntimesByPath|projectRuntimesByName)\b/u
const singletonRuntimeField =
  /(?:private|readonly|let|const)\s+(?:activeRuntime|currentRuntime|runtimeSingleton)\b/u
const forbiddenMapKey = /new\s+Map\s*<\s*(?:CanonicalPath|ProjectName)\s*,/u

export function validateRuntimeManagerSource(
  source: string
): RuntimeManagerSourceGuardReport {
  const violations: string[] = []
  if (
    !/const\s+entries\s*=\s*new\s+Map<string,\s*ProjectRuntimeEntry>/u.test(
      source
    )
  )
    violations.push('missing-stable-id-entry-map')
  if (forbiddenStateMapName.test(source))
    violations.push('parallel-or-semantic-runtime-map')
  if (singletonRuntimeField.test(source))
    violations.push('singleton-runtime-field')
  if (forbiddenMapKey.test(source)) violations.push('path-or-name-map-key')
  if (!source.includes('ownership = new Map<string, ManagedOwnership>()'))
    violations.push('missing-cleanup-identity-index')
  return Object.freeze({
    accepted: violations.length === 0,
    violations: Object.freeze(violations),
  })
}
