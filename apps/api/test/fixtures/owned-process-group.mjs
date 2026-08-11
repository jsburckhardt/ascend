#!/usr/bin/env node
import { spawn } from 'node:child_process'

const stubbornDescendant = process.argv[2] === 'stubborn'
const descendantProgram = stubbornDescendant
  ? "process.on('SIGTERM',()=>{});process.stdout.write('ready\\n');setInterval(()=>{},1000)"
  : "process.on('SIGTERM',()=>process.exit(0));process.stdout.write('ready\\n');setInterval(()=>{},1000)"
const descendant = spawn(process.execPath, ['-e', descendantProgram], {
  stdio: ['ignore', 'pipe', 'ignore'],
})
descendant.stdout.once('data', () => process.stdout.write('ready\n'))
process.on('SIGTERM', () => setTimeout(() => process.exit(0), 25))
setInterval(() => undefined, 1_000)
