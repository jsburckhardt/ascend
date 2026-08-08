import { defineExtension } from '@ai-substrate/engineering-harness/contract';

export default defineExtension({
  name: 'checks',
  summary: 'Wraps `just verify`.',
  verbs: {
    'checks': {
      summary: 'Wraps `just verify`.',
      async run(ctx) {
        const result = await ctx.exec('just', ['verify'], { timeoutMs: 120_000 });
        const stdout = result.stdout.trimEnd().split('\n').slice(-20).join('\n');
        return result.ok
          ? ctx.ok({ command: 'just verify', stdout })
          : ctx.error('E_WRAP_FAILED', `just verify failed (exit ${result.code})`, {
              details: result.stderr,
              next_action: 'Fix the failure above, then re-run `harness checks`.',
            });
      },
    },
  },
});
