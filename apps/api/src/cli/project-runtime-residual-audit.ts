import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { readProcessStartTime } from '../project-runtime-process.js'

interface Episode {
  process: { pid: number; processStartTime: string }
  listener: { port: number; inode: string }
}

const root = path.resolve(
  import.meta.dirname,
  '../../../..',
  'test-results/bl-010/project-runtime'
)
const episodePath = path.join(root, 'episode.json')
const outputPath = path.join(root, 'residual-audit.json')

async function listenerInodeExists(inode: string): Promise<boolean> {
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    const rows = (await readFile(file, 'utf8'))
      .trim()
      .split(String.fromCharCode(10))
      .slice(1)
    if (
      rows.some((row) => {
        const fields = row.trim().split(/\s+/u)
        return fields[3] === '0A' && fields[9] === inode
      })
    ) {
      return true
    }
  }
  return false
}

async function main(): Promise<void> {
  const episode = JSON.parse(await readFile(episodePath, 'utf8')) as Episode
  const processPresent =
    (await readProcessStartTime(episode.process.pid)) ===
    episode.process.processStartTime
  const listenerPresent = await listenerInodeExists(episode.listener.inode)
  const result = {
    version: 1,
    checked: {
      pidIdentities: 1,
      listenerInodes: 1,
      port: episode.listener.port,
    },
    residuals: {
      pidIdentities: processPresent ? 1 : 0,
      listeners: listenerPresent ? 1 : 0,
    },
    status: processPresent || listenerPresent ? 'failed' : 'ok',
  }
  await mkdir(root, { recursive: true })
  await writeFile(
    outputPath,
    JSON.stringify(result, null, 2) + String.fromCharCode(10)
  )
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  if (result.status !== 'ok') process.exitCode = 1
}

void main().catch(() => {
  process.stderr.write(
    JSON.stringify({
      status: 'failed',
      category: 'runtime-residual-audit-unavailable',
      action: 'Run the designated project runtime proof before retrying.',
    }) + String.fromCharCode(10)
  )
  process.exitCode = 1
})
