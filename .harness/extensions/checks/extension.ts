import { defineExtension } from "@ai-substrate/engineering-harness/contract";
import { runChecks } from "./budget.js";

export default defineExtension({
  name: "checks",
  summary: "Wraps just verify.",
  verbs: {
    checks: {
      summary: "Wraps just verify.",
      async run(ctx) {
        return runChecks(ctx);
      },
    },
  },
});
