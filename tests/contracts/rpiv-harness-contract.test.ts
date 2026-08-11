import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  allProfilePaths,
  apsPath,
  coordinatorPath,
  correctionSeamFailureTraces,
  positiveMatrix,
  quotePosix,
  root,
  SeamSensor,
  sha256,
  validateFixture,
  type Fixture,
} from './rpiv-harness-validator.js'
import { signedRunMappings } from './aps-source-validator.js'

const resultDir = path.join(root, 'test-results/issue-23')
const matrixPath = path.join(resultDir, 'rpiv-harness-contract-matrix.json')
const fixtureDir = path.join(root, 'tests/contracts/fixtures/rpiv-harness')

afterAll(() =>
  rmSync(path.join(root, 'test-results/issue-23/tmp'), {
    recursive: true,
    force: true,
  })
)

describe('APS-enforced RPIV harness profile', () => {
  it('passes the positive profile, complete APS inventory, regression, and documentation matrix', () => {
    const before = Object.fromEntries(
      allProfilePaths.map((target) => [target, sha256(target)])
    )
    const rows = positiveMatrix()
    const failed = rows.filter((row) => row.status === 'fail')
    mkdirSync(resultDir, { recursive: true })
    writeFileSync(
      matrixPath,
      JSON.stringify({ issue: 23, rows }, null, 2) + '\n'
    )
    expect(
      failed,
      failed.map((row) => `${row.rule}:${row.target}`).join('\n')
    ).toEqual([])
    expect(
      allProfilePaths.every((target) =>
        rows.some((row) => row.target === target)
      )
    ).toBe(true)
    expect(
      Object.fromEntries(
        allProfilePaths.map((target) => [target, sha256(target)])
      )
    ).toEqual(before)
    expect(JSON.parse(readFileSync(matrixPath, 'utf8')).rows).toHaveLength(
      rows.length
    )
  })

  it('maps every declared process signature at every RUN call one-for-one', () => {
    const expected = new Map([
      ['apply-rpiv-profile', 2],
      ['dispatch-research', 1],
      ['dispatch-plan', 2],
      ['dispatch-implement', 2],
      ['dispatch-verify', 2],
      ['run-lifecycle-seam', 4],
    ])
    const mappings = [apsPath, coordinatorPath].flatMap((target) => [
      ...signedRunMappings(readFileSync(path.join(root, target), 'utf8')),
    ])
    expect(new Map(mappings.map(([id, calls]) => [id, calls.length]))).toEqual(
      expected
    )
    for (const [id, calls] of mappings) {
      expect(calls.length, id).toBeGreaterThan(0)
      for (const call of calls)
        expect([...call.parameters.entries()], id + ':' + call.line).toEqual(
          [...call.parameters.entries()].sort(([left], [right]) =>
            left.localeCompare(right)
          )
        )
    }
  })

  it('preserves shell-sensitive descriptions as one literal harness argv value', () => {
    const temporary = mkdtempSync(path.join(tmpdir(), 'rpiv-harness-'))
    const executable = path.join(temporary, 'harness')
    writeFileSync(
      executable,
      '#!/bin/sh\nprintf "%s\\n" "$#" "$1" "$2" "$3" "$4"\n',
      { mode: 0o755 }
    )
    const description = 'spaces \'single\' "double" $HOME; `tick` $(touch nope)'
    const output = execFileSync(
      'sh',
      ['-c', `harness observe ${quotePosix(description)} --kind difficulty`],
      {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${temporary}:${process.env.PATH}` },
      }
    )
      .trim()
      .split('\n')
    expect(output).toEqual([
      '4',
      'observe',
      description,
      '--kind',
      'difficulty',
    ])
    expect(readdirSync(temporary)).toEqual(['harness'])
    rmSync(temporary, { recursive: true, force: true })
  })

  it('executes initial and correction seams with result gating and serialization', () => {
    expect(
      correctionSeamFailureTraces(
        readFileSync(path.join(root, coordinatorPath), 'utf8')
      )
    ).toEqual([
      {
        seam: 'pre-coding',
        seamFailureSet: true,
        nextStage: 'dispatch-implement',
        nextStageExecuted: false,
        returnFormat: 'PIPELINE_ERROR',
        returnedDetails: 'SEAM_FAILURE',
      },
      {
        seam: 'post-coding',
        seamFailureSet: true,
        nextStage: 'dispatch-verify',
        nextStageExecuted: false,
        returnFormat: 'PIPELINE_ERROR',
        returnedDetails: 'SEAM_FAILURE',
      },
    ])
    const transitions = [
      'pre-flight|research|1',
      'pre-coding|implement|1',
      'post-coding|verify|1',
      'post-flight|complete|1',
      'pre-coding|implement|2',
      'post-coding|verify|2',
    ] as const
    const sensor = new SeamSensor()
    for (const transition of transitions) {
      expect(sensor.canDispatch(transition)).toBe(false)
      expect(sensor.run(transition, 'success')).toBe('success')
      expect(sensor.canDispatch(transition)).toBe(true)
    }
    expect(sensor.run(transitions[1], 'success')).toBe('deduplicated')

    const failures = [
      'host-unavailable',
      'skill-unavailable',
      'invocation-unavailable',
      'empty-result',
      'malformed-result',
      'non-success-result',
    ] as const
    for (const failure of failures) {
      const failed = new SeamSensor()
      expect(failed.run('pre-coding|implement|1', failure)).toBe(failure)
      expect(failed.canDispatch('pre-coding|implement|1')).toBe(false)
      expect(failed.isActive()).toBe(false)
    }

    const overlap = new SeamSensor()
    overlap.begin()
    expect(overlap.run('post-coding|verify|2', 'success')).toBe('overlap')
    expect(overlap.canDispatch('post-coding|verify|2')).toBe(false)
    expect(overlap.calls).toBe(0)
  })

  it('rejects every deterministic negative fixture for its expected rule only', () => {
    const results = readdirSync(fixtureDir)
      .sort()
      .map((name) => {
        const fixture = JSON.parse(
          readFileSync(path.join(fixtureDir, name), 'utf8')
        ) as Fixture
        return {
          fixture: name,
          expected: fixture.expectedRule,
          actual: validateFixture(fixture),
        }
      })
    for (const result of results)
      expect(result.actual, result.fixture).toEqual([result.expected])
    writeFileSync(
      path.join(resultDir, 'rpiv-harness-negative-fixtures.json'),
      JSON.stringify({ issue: 23, results }, null, 2) + '\n'
    )
    expect(results).toHaveLength(26)
  })
})
