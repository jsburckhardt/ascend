import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const [dirtyFileName, marker, requestedPrefix = 'BL014'] = process.argv.slice(2)
if (!dirtyFileName || !marker || !/^BL01[34]$/u.test(requestedPrefix))
  process.exit(64)
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8' }).trimEnd()
const status = Buffer.from(
  git('status', '--porcelain') + String.fromCharCode(10)
).toString('base64')
const values = [
  ['PWD', process.cwd()],
  ['ROOT', git('rev-parse', '--show-toplevel')],
  ['BRANCH', git('branch', '--show-current')],
  ['STATUS', status],
  ['STATUS_END', ''],
  ['GIT_SENTINEL', git('config', 'ascend.fixture')],
  ['TERMINAL_SENTINEL', readFileSync(dirtyFileName, 'utf8').trimEnd()],
  ['DONE', marker],
]
process.stdout.write(
  values
    .map(([key, value]) => requestedPrefix + '_' + key + '=' + value)
    .join('') + String.fromCharCode(10)
)
