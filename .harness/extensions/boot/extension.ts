import { defineExtension } from "@ai-substrate/engineering-harness/contract";
import { runBoot } from "./readiness.js";

export default defineExtension({
  name: "boot",
  summary: "Proves the Ascend scaffold is ready for development.",
  verbs: {
    boot: {
      summary: "Runs the canonical checks and reports Ascend development endpoints.",
      async run(ctx) {
        return runBoot(ctx);
      },
    },
  },
});
