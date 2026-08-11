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
  positiveMatrix,
  quotePosix,
  root,
  SeamSensor,
  sha256,
  validateFixture,
  type Fixture,
} from './rpiv-harness-validator.js'

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

  it('serializes lifecycle transitions and deduplicates only identical successes', () => {
    const sensor = new SeamSensor()
    expect(sensor.run('pre-coding|implement|1', 'failed')).toBe('failed')
    expect(sensor.run('pre-coding|implement|1', 'success')).toBe('success')
    expect(sensor.run('pre-coding|implement|1', 'success')).toBe('deduplicated')
    expect(sensor.run('pre-coding|implement|2', 'success')).toBe('success')
    sensor.begin()
    expect(sensor.run('post-coding|verify|2', 'success')).toBe('overlap')
    expect(sensor.calls).toBe(3)
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
    expect(results.length).toBeGreaterThanOrEqual(18)
  })
})
