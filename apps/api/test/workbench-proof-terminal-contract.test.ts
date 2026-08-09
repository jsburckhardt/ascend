import { describe, expect, it } from 'vitest'
import {
  TERMINAL_COMMAND_TIMEOUT_MS,
  TERMINAL_ENVIRONMENT_ALLOWLIST,
  TERMINAL_EPISODE_TIMEOUT_MS,
  TERMINAL_IDENTITY_COMMANDS,
  TERMINAL_TOOL_COMMANDS,
  classifyPathEnvironment,
  normalizeTerminalOutput,
  type ExecutableResolution,
  type TerminalEnvironmentEvidence,
} from '../src/workbench-proof-contract.js'

const resolutions = (prefix: string): ExecutableResolution[] =>
  ['git', 'gh', 'tmux', 'docker', 'copilot'].map((executable) => ({
    executable,
    canonicalPath: prefix + '/' + executable,
  }))

describe('BL-002 terminal parity contract', () => {
  it('pins identity probes, the exact ordered tool list, and finite bounds', () => {
    expect(TERMINAL_IDENTITY_COMMANDS.map(({ command }) => command)).toEqual([
      'hostname',
      'id -un',
      'pwd -P',
    ])
    expect(TERMINAL_TOOL_COMMANDS).toEqual([
      {
        key: 'git-version',
        executable: 'git',
        args: ['--version'],
        command: 'git --version',
      },
      {
        key: 'git-status',
        executable: 'git',
        args: ['status', '--short'],
        command: 'git status --short',
      },
      {
        key: 'gh-version',
        executable: 'gh',
        args: ['--version'],
        command: 'gh --version',
      },
      {
        key: 'tmux-version',
        executable: 'tmux',
        args: ['-V'],
        command: 'tmux -V',
      },
      {
        key: 'docker-version',
        executable: 'docker',
        args: ['--version'],
        command: 'docker --version',
      },
      {
        key: 'copilot-version',
        executable: 'copilot',
        args: ['--version'],
        command: 'copilot --version',
      },
    ])
    expect(TERMINAL_COMMAND_TIMEOUT_MS).toBe(5_000)
    expect(TERMINAL_EPISODE_TIMEOUT_MS).toBe(90_000)
  })

  it.each([
    ['LF', ' leading\ntrailing \n', ' leading\ntrailing \n'],
    ['CRLF', 'one\r\ntwo\r\n', 'one\ntwo\n'],
    ['lone CR', 'one\rtwo\r', 'one\ntwo\n'],
    [
      'control bytes and text',
      '\u001b[31m https://example.test/v1\rversion 1.2.3 \u0000',
      '\u001b[31m https://example.test/v1\nversion 1.2.3 \u0000',
    ],
  ])('normalizes only line endings for %s', (_name, input, expected) => {
    expect(normalizeTerminalOutput(input)).toBe(expected)
  })

  it('classifies only PATH using fixed executable resolutions', () => {
    const direct = resolutions('/tools')
    expect(TERMINAL_ENVIRONMENT_ALLOWLIST).toEqual(['PATH'])
    expect(classifyPathEnvironment('/tools', '/tools', direct, direct)).toBe(
      'equal'
    )
    expect(
      classifyPathEnvironment('/tools', '/tools:/extra', direct, direct)
    ).toBe('allowed difference')
    expect(
      classifyPathEnvironment('/tools', '/other', direct, resolutions('/other'))
    ).toBe('unexplained failure-causing difference')
    expect(
      classifyPathEnvironment(
        '/tools',
        '/other',
        direct,
        direct.map((entry) =>
          entry.executable === 'git' ? { ...entry, canonicalPath: null } : entry
        )
      )
    ).toBe('unexplained failure-causing difference')

    const evidence: TerminalEnvironmentEvidence = {
      variable: 'PATH',
      direct: '/tools',
      integrated: '/tools:/extra',
      classification: 'allowed difference',
      directResolutions: direct,
      integratedResolutions: direct,
    }
    expect(Object.keys(evidence).sort()).toEqual([
      'classification',
      'direct',
      'directResolutions',
      'integrated',
      'integratedResolutions',
      'variable',
    ])
  })
})
