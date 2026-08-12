export const DEFAULT_VERIFY_TIMEOUT_MS = 600_000;
export const VERIFY_TIMEOUT_ENV = "ASCEND_HARNESS_VERIFY_TIMEOUT_MS";
const MIN_VERIFY_TIMEOUT_MS = 120_001;
const MAX_VERIFY_TIMEOUT_MS = 3_600_000;

const tail = (output: string) => output.trimEnd().split("\n").slice(-20).join("\n");

const timeoutGuidance = () =>
  VERIFY_TIMEOUT_ENV + " must be an integer between " + MIN_VERIFY_TIMEOUT_MS + " and " + MAX_VERIFY_TIMEOUT_MS + ".";

export const resolveVerifyTimeoutMs = (
  rawValue: string | undefined = process.env[VERIFY_TIMEOUT_ENV],
): number => {
  if (rawValue === undefined || rawValue.trim() === "") return DEFAULT_VERIFY_TIMEOUT_MS;
  if (!/^\d+$/.test(rawValue)) throw new Error(timeoutGuidance());
  const timeoutMs = Number(rawValue);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < MIN_VERIFY_TIMEOUT_MS || timeoutMs > MAX_VERIFY_TIMEOUT_MS) {
    throw new Error(timeoutGuidance());
  }
  return timeoutMs;
};

type ExecResult = { ok: boolean; code: number; stdout: string; stderr: string };
type ChecksContext = {
  exec(command: string, args: string[], options: { timeoutMs: number }): Promise<ExecResult>;
  ok(data: Record<string, unknown>): unknown;
  error(code: string, message: string, options: Record<string, unknown>): unknown;
};
type ChecksOptions = { timeoutValue?: string; now?: () => number };

export const runChecks = async (ctx: ChecksContext, options: ChecksOptions = {}) => {
  let timeoutMs: number;
  try {
    timeoutMs = resolveVerifyTimeoutMs(options.timeoutValue);
  } catch (error) {
    return ctx.error("E_INVALID_TIMEOUT", "Harness verification timeout is invalid.", {
      details: error instanceof Error ? error.message : "Verification timeout configuration is invalid.",
      next_action: "Set " + VERIFY_TIMEOUT_ENV + " to a finite integer above 120000 ms, then re-run harness checks.",
    });
  }

  const now = options.now ?? Date.now;
  const startedAt = now();
  const result = await ctx.exec("just", ["verify"], { timeoutMs });
  const elapsedMs = Math.max(0, now() - startedAt);
  const stdout = tail(result.stdout);
  const timedOut = elapsedMs > timeoutMs;
  const details =
    [
      result.stderr.trim() ? "stderr:\n" + tail(result.stderr) : "",
      result.stdout.trim() ? "stdout:\n" + stdout : "",
    ]
      .filter(Boolean)
      .join("\n\n") ||
    "just verify exited with code " + result.code + " without diagnostic output.";

  if (result.ok && !timedOut) {
    return ctx.ok({ command: "just verify", stdout, timeout_ms: timeoutMs, elapsed_ms: elapsedMs });
  }

  return ctx.error(
    timedOut ? "E_WRAP_TIMEOUT" : "E_WRAP_FAILED",
    timedOut
      ? "just verify exceeded the configured " + timeoutMs + " ms budget."
      : "just verify failed (exit " + result.code + ")",
    {
      details,
      timeout_ms: timeoutMs,
      elapsed_ms: elapsedMs,
      next_action: "Fix the failure above, then re-run harness checks.",
    },
  );
};

