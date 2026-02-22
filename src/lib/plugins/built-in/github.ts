import type { HoundPlugin, PluginContext } from "../plugin-api";

const githubPlugin: HoundPlugin = {
  name: "github",
  version: "1.0.0",
  description: "Post test results as GitHub PR comments and check runs",
  category: "integration",

  reporter: {
    name: "github-reporter",

    onRunComplete: async (
      runResult: Record<string, unknown>,
      ctx: PluginContext
    ) => {
      const token = ctx.config.token as string;
      const repo = ctx.config.repo as string;
      const prNumber = ctx.config.prNumber as number;

      if (!token || !repo || !prNumber) return;

      const status = runResult.status as string;
      const testName = (runResult.testName as string) || "Unknown test";
      const duration = (runResult.duration as number) || 0;
      const steps =
        (runResult.steps as {
          status: string;
          description: string;
          error?: string;
        }[]) || [];

      const icon = status === "PASSED" ? "✅" : "❌";
      let body = `## ${icon} Hound Test: ${testName}\n\n`;
      body += `**Status:** ${status} | **Duration:** ${(duration / 1000).toFixed(1)}s\n\n`;

      if (steps.length > 0) {
        body += "| Step | Status |\n|------|--------|\n";
        for (const step of steps) {
          const stepIcon =
            step.status === "PASSED"
              ? "✅"
              : step.status === "FAILED"
                ? "❌"
                : "⏭";
          body += `| ${step.description} | ${stepIcon} ${step.status} |\n`;
        }
      }

      const failedSteps = steps.filter(
        (s) => s.status === "FAILED" && s.error
      );
      if (failedSteps.length > 0) {
        body += "\n### Errors\n";
        for (const step of failedSteps) {
          body += `\n> **${step.description}:** ${step.error}\n`;
        }
      }

      await fetch(
        `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        }
      );
    },
  },
};

export default githubPlugin;
