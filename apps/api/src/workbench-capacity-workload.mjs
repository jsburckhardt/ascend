const duration = Number(process.argv[2] ?? 7000)
setTimeout(() => {
  process.stdout.write('capacity-workload-complete\n')
}, duration)
