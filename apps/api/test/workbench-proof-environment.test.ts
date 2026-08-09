import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, it, vi } from 'vitest'
import { BL001_ROOT, REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'
import {
  startWorkbenchProof,
  stopWorkbenchProof,
  type StartProofResult,
} from '../src/workbench-proof-runtime.js'

const fakeExecutable = path.join(
  REPOSITORY_ROOT,
  'apps/api/test/fixtures/fake-code-server.mjs'
)
it('uses documented shell and locale fallbacks for the child', async () => {
  await mkdir(BL001_ROOT, { recursive: true })
  const runRoot = await mkdtemp(path.join(BL001_ROOT, 'environment-'))
  const environmentPath = path.join(runRoot, 'environment.json')
  const originalLang = process.env.LANG
  const userInfo = os.userInfo()
  const userInfoSpy = vi
    .spyOn(os, 'userInfo')
    .mockReturnValue({ ...userInfo, shell: '' })
  delete process.env.LANG
  let result: StartProofResult | undefined
  try {
    result = await startWorkbenchProof({
      executablePath: fakeExecutable,
      runRoot,
      startupTimeoutMs: 2_000,
      environmentOverrides: {
        BL001_FAKE_MODE: 'ready',
        BL001_CAPTURE_ENV: environmentPath,
      },
    })

    await expect(
      readFile(environmentPath, 'utf8').then(JSON.parse)
    ).resolves.toEqual({
      LANG: 'C.UTF-8',
      SHELL: '/bin/bash',
    })
  } finally {
    userInfoSpy.mockRestore()
    if (originalLang === undefined) delete process.env.LANG
    else process.env.LANG = originalLang
    if (result) await stopWorkbenchProof(result.handle, { runRoot })
    await rm(runRoot, { recursive: true, force: true })
  }
})
