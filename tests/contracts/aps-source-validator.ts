export type ApsDiagnostic = {
  rule: string
  line: number
  message: string
}

export type ProcessCall = {
  kind: 'RUN' | 'USE'
  id: string
  line: number
  parameters: Map<string, string>
}

type ProcessSignature = {
  args: Map<string, string>
  body: string
}

const normalizeArgument = (name: string): string => name.toLowerCase()

const splitParameters = (source: string): string[] => {
  const entries: string[] = []
  let current = ''
  let depth = 0
  let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') quoted = !quoted
    if (!quoted && '[{('.includes(character)) depth += 1
    if (!quoted && ']})'.includes(character)) depth -= 1
    if (character === ',' && depth === 0 && !quoted) {
      entries.push(current.trim())
      current = ''
    } else current += character
  }
  if (current.trim()) entries.push(current.trim())
  return entries
}

const parseParameters = (source: string | undefined): Map<string, string> => {
  const parameters = new Map<string, string>()
  if (!source) return parameters
  for (const entry of splitParameters(source)) {
    const match = entry.match(/^([a-z][a-z0-9_-]*)=(.+)$/)
    if (match) parameters.set(match[1], match[2].trim())
  }
  return parameters
}

const parseSignatures = (source: string): Map<string, ProcessSignature> => {
  const signatures = new Map<string, ProcessSignature>()
  const pattern =
    /<process id="([a-z][a-z0-9_-]{1,63})"[^>]*?(?: args="([^"]*)")?>([\s\S]*?)<\/process>/g
  for (const match of source.matchAll(pattern)) {
    const args = new Map<string, string>()
    for (const entry of splitParameters(match[2] ?? '')) {
      const argument = entry.match(
        /^([A-Z][A-Z0-9_]*):\s*([A-Za-z][A-Za-z0-9\[\]]*)$/
      )
      if (argument) args.set(normalizeArgument(argument[1]), argument[2])
    }
    signatures.set(match[1], { args, body: match[3] })
  }
  return signatures
}

const declaredTypes = (source: string): Map<string, string> => {
  const declarations = new Map<string, string>()
  for (const match of source.matchAll(/^([A-Z][A-Z0-9_]+):\s*(.*)$/gm)) {
    const value = match[2].trim()
    let type = 'Unknown'
    if (/^"/.test(value)) type = match[1].endsWith('_PATH') ? 'Path' : 'String'
    else if (/^-?\d+$/.test(value)) type = 'Integer'
    else if (/^(?:true|false)$/.test(value)) type = 'Boolean'
    else if (/^\{/.test(value) || value === 'Object') type = 'Object'
    else if (/^\[/.test(value) || /\[\]$/.test(value)) type = 'Array'
    else if (/^(?:String|Path|Integer|Number|Boolean|Object)$/.test(value))
      type = value
    declarations.set(match[1], type)
  }
  return declarations
}

const compatibleType = (
  expected: string,
  actual: string | undefined
): boolean => {
  if (!actual || actual === 'Unknown') return false
  if (expected === actual) return true
  return expected === 'Number' && actual === 'Integer'
}

export const frontmatterTools = (source: string): Set<string> => {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  const block =
    frontmatter.match(/^tools:\n([\s\S]*?)(?=^[a-z][\w-]*:|\Z)/m)?.[1] ?? ''
  return new Set(
    [...block.matchAll(/^\s+-\s+(.+)$/gm)].map((entry) => entry[1].trim())
  )
}

export const registeredAdapterTools = (adapter: string): Set<string> => {
  const block = adapter.match(/TOOLS: CSV<<\n([\s\S]*?)\n>>/)?.[1] ?? ''
  const tools = new Set<string>()
  for (const line of block.split('\n').slice(1)) {
    const columns = line.split(',')
    const qualified = columns[2]?.trim()
    if (qualified) tools.add(qualified)
  }
  tools.add('selection')
  tools.add('todo')
  return tools
}

export const parseProcessCalls = (source: string): ProcessCall[] => {
  const calls: ProcessCall[] = []
  for (const [index, line] of source.split('\n').entries()) {
    const statement = line.match(/^\s*(RUN|USE)\s+(.+)$/)
    if (!statement) continue
    const parsed = statement[2].match(/^`([^`]+)`(?:\s+where:\s+(.+))?$/)
    if (!parsed) continue
    calls.push({
      kind: statement[1] as 'RUN' | 'USE',
      id: parsed[1],
      line: index + 1,
      parameters: parseParameters(parsed[2]),
    })
  }
  return calls
}

export const signedRunMappings = (
  source: string
): Map<string, ProcessCall[]> => {
  const signatures = parseSignatures(source)
  const calls = parseProcessCalls(source).filter((call) => call.kind === 'RUN')
  return new Map(
    [...signatures.entries()]
      .filter(([, signature]) => signature.args.size > 0)
      .map(([id]) => [id, calls.filter((call) => call.id === id)])
  )
}

export const validateApsSource = (
  source: string,
  registeredTools: ReadonlySet<string>,
  requireFrontmatter = true
): ApsDiagnostic[] => {
  const diagnostics: ApsDiagnostic[] = []
  const signatures = parseSignatures(source)
  const symbols = declaredTypes(source)
  const allowedTools = frontmatterTools(source)
  const lines = source.split('\n')
  for (const [index, line] of lines.entries()) {
    const statement = line.match(/^\s*(RUN|USE)\s+(.+)$/)
    if (!statement) continue
    const parsed = statement[2].match(/^`([^`]+)`(?:\s+where:\s+(.+))?$/)
    if (!parsed) {
      diagnostics.push({
        rule: 'APS_STATEMENT_IDS',
        line: index + 1,
        message: 'RUN/USE requires one grammatical BacktickId',
      })
      continue
    }
    const kind = statement[1]
    const id = parsed[1]
    const parameters = parseParameters(parsed[2])
    const keys = [...parameters.keys()]
    if (keys.join('|') !== [...keys].sort().join('|'))
      diagnostics.push({
        rule: 'APS_WHERE_ORDER',
        line: index + 1,
        message: 'where parameters must be lexicographic',
      })
    if (kind === 'RUN') {
      if (!/^[a-z][a-z0-9_-]{1,63}$/.test(id) || !signatures.has(id)) {
        diagnostics.push({
          rule: 'APS_STATEMENT_IDS',
          line: index + 1,
          message: 'RUN must name a declared grammatical process id',
        })
        continue
      }
      const expected = signatures.get(id)?.args ?? new Map<string, string>()
      const missing = [...expected.keys()].filter((key) => !parameters.has(key))
      const extra = [...parameters.keys()].filter((key) => !expected.has(key))
      const incompatible = [...expected.entries()].filter(([key, type]) => {
        const value = parameters.get(key)
        if (!value || !/^[A-Z][A-Z0-9_]+$/.test(value)) return true
        return (
          value !== key.toUpperCase() ||
          !compatibleType(type, symbols.get(value))
        )
      })
      if (missing.length || extra.length || incompatible.length)
        diagnostics.push({
          rule: 'APS_RUN_ARGUMENTS',
          line: index + 1,
          message:
            'RUN arguments must map every declared type/name one-for-one',
        })
    } else {
      const grammatical =
        /^[a-z][a-z0-9_-]{1,63}(?:\/[a-z][A-Za-z0-9_-]{1,63})?$/.test(id)
      if (!grammatical) {
        diagnostics.push({
          rule: 'APS_STATEMENT_IDS',
          line: index + 1,
          message:
            'USE requires a grammatical registered tool id, not a slash command',
        })
        continue
      }
      if (
        !registeredTools.has(id) ||
        (requireFrontmatter && !allowedTools.has(id))
      )
        diagnostics.push({
          rule: 'APS_TOOL_ALLOWLIST',
          line: index + 1,
          message: 'USE tool is not registered and explicitly allowed',
        })
    }
  }
  return diagnostics
}

export const validateLifecycleHostCall = (source: string): ApsDiagnostic[] => {
  const calls = parseProcessCalls(source).filter(
    (call) => call.kind === 'USE' && call.id === 'vscode/runCommand'
  )
  const valid =
    calls.length === 1 &&
    calls[0].parameters.get('arguments') ===
      '["--hook", SEAM_HOOK, "--json"]' &&
    calls[0].parameters.get('command') === 'HARNESS_SKILL'
  return valid
    ? []
    : [
        {
          rule: 'LIFECYCLE_HOST_PARAMETERS',
          line: calls[0]?.line ?? 0,
          message:
            'Lifecycle host call must use exact ordered hook arguments and the eng-harness-flow front door',
        },
      ]
}

export const validateLifecycleSerialization = (
  source: string
): ApsDiagnostic[] => {
  const seam =
    source.match(/<process id="run-lifecycle-seam"[\s\S]*?<\/process>/)?.[0] ??
    source
  const required = [
    'IF ACTIVE_SEAM is not empty',
    'SET ACTIVE_SEAM := SEAM_ID',
    'CAPTURE HARNESS_RESULT',
    'RECOVER (err):',
    'SET ACTIVE_SEAM := ""',
    'SET SUCCESSFUL_SEAMS := SUCCESSFUL_SEAMS + [SEAM_ID]',
  ]
  let offset = -1
  const ordered = required.every((token) => {
    offset = seam.indexOf(token, offset + 1)
    return offset >= 0
  })
  const clears = (seam.match(/SET ACTIVE_SEAM := \"\"/g) ?? []).length
  return ordered && clears >= 3
    ? []
    : [
        {
          rule: 'LIFECYCLE_SERIALIZATION',
          line: 0,
          message:
            'Lifecycle seam must block overlap and clear active state after every explicit result',
        },
      ]
}
