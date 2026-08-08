import { defineExtension } from '@ai-substrate/engineering-harness/contract';

const tail = (output: string) => output.trimEnd().split('\n').slice(-20).join('\n');

export default defineExtension({
  name: 'checks',
  summary: 'Wraps `just verify`.',
  verbs: {
    'checks': {
      summary: 'Wraps `just verify`.',
      async run(ctx) {
        const result = await ctx.exec('just', ['verify'], { timeoutMs: 120_000 });
        const stdout = tail(result.stdout);
        const details =
          [
            result.stderr.trim() ? `stderr:\n${tail(result.stderr)}` : '',
            result.stdout.trim() ? `stdout:\n${stdout}` : '',
          ]
            .filter(Boolean)
            .join('\n\n') ||
          `just verify exited with code ${result.code} without diagnostic output.`;

        return result.ok
          ? ctx.ok({ command: 'just verify', stdout })
          : ctx.error('E_WRAP_FAILED', `just verify failed (exit ${result.code})`, {
              details,
              next_action: 'Fix the failure above, then re-run `harness checks`.',
            });
      },
    },
  },
});
