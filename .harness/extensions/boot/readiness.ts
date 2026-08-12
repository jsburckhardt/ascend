import { resolveVerifyTimeoutMs } from "../checks/budget.js";

export const BOOT_CHECKS_OVERHEAD_MS = 10_000;

export const resolveBootChecksTimeoutMs = (rawValue?: string): number =>
  resolveVerifyTimeoutMs(rawValue) + BOOT_CHECKS_OVERHEAD_MS;

type ExecResult = { ok: boolean; stdout: string; stderr: string };
type BootContext = {
  exec(command: string, args: string[], options: { timeoutMs: number }): Promise<ExecResult>;
  ok(data: Record<string, unknown>): unknown;
  error(code: string, message: string, options: Record<string, unknown>): unknown;
};
type BootOptions = { timeoutValue?: string; now?: () => number };

export const runBoot = async (ctx: BootContext, options: BootOptions = {}) => {
  let timeoutMs: number;
  try {
    timeoutMs = resolveBootChecksTimeoutMs(options.timeoutValue);
  } catch (error) {
    return ctx.error("E_BOOT_TIMEOUT_INVALID", "Ascend readiness timeout is invalid.", {
      details: error instanceof Error ? error.message : "Readiness timeout configuration is invalid.",
      next_action: "Correct the harness verification timeout, then re-run harness boot.",
    });
  }
  const now = options.now ?? Date.now;
  const startedAt = now();
  const checks = await ctx.exec("harness", ["checks", "--json"], { timeoutMs });
  const durationMs = Math.max(0, now() - startedAt);

  if (!checks.ok) {
    return ctx.error("E_BOOT_CHECKS_FAILED", "Ascend readiness checks failed after " + durationMs + "ms.", {
      details: "duration_ms=" + durationMs + "\n" + (checks.stderr || checks.stdout),
      next_action: "Fix the checks failure, then re-run harness boot.",
    });
  }

  return ctx.ok({
    readiness: "ready",
    proof: "harness checks",
    duration_ms: durationMs,
    checks_timeout_ms: timeoutMs,
    mode: "test-backed scaffold",
    start_command: "just run",
    endpoints: { web: "http://127.0.0.1:5173", api: "http://127.0.0.1:3000" },
    note: "Boot proves both application boundaries without leaving development servers running.",
  });
};
