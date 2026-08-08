import { defineExtension } from '@ai-substrate/engineering-harness/contract';

export default defineExtension({
  name: 'boot',
  summary: 'Proves the Ascend scaffold is ready for development.',
  verbs: {
    'boot': {
      summary: 'Runs the canonical checks and reports Ascend development endpoints.',
      async run(ctx) {
        const startedAt = Date.now();
        const checks = await ctx.exec('harness', ['checks', '--json'], {
          timeoutMs: 150_000,
        });
        const durationMs = Date.now() - startedAt;

        if (!checks.ok) {
          return ctx.error(
            'E_BOOT_CHECKS_FAILED',
            `Ascend readiness checks failed after ${durationMs}ms.`,
            {
              details: `duration_ms=${durationMs}\n${checks.stderr || checks.stdout}`,
              next_action: 'Fix the checks failure, then re-run `harness boot`.',
            },
          );
        }

        return ctx.ok({
          readiness: 'ready',
          proof: 'harness checks',
          duration_ms: durationMs,
          mode: 'test-backed scaffold',
          start_command: 'just run',
          endpoints: {
            web: 'http://127.0.0.1:5173',
            api: 'http://127.0.0.1:3000',
          },
          note: 'Boot proves both application boundaries without leaving development servers running.',
        });
      },
    },
  },
});
