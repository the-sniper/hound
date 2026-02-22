import type { HoundPlugin, PluginContext } from "../plugin-api";

const linearPlugin: HoundPlugin = {
  name: "linear",
  version: "1.0.0",
  description: "Create Linear issues for failed test runs",
  category: "integration",

  reporter: {
    name: "linear-reporter",

    onRunComplete: async (runResult: Record<string, unknown>, ctx: PluginContext) => {
      const status = runResult.status as string;
      if (status !== "FAILED") return;

      const apiKey = ctx.config.apiKey as string;
      const teamId = ctx.config.teamId as string;

      if (!apiKey || !teamId) return;

      const testName = (runResult.testName as string) || "Unknown test";
      const steps =
        (runResult.steps as { status: string; description: string; error?: string }[]) || [];

      const failedSteps = steps.filter((s) => s.status === "FAILED");
      let description = `Test "${testName}" failed.\n\n## Failed Steps\n`;
      for (const step of failedSteps) {
        description += `- ${step.description}`;
        if (step.error) description += `: ${step.error}`;
        description += "\n";
      }

      await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }`,
          variables: {
            input: {
              teamId,
              title: `[Hound] Test failed: ${testName}`,
              description,
            },
          },
        }),
      });
    },
  },
};

export default linearPlugin;
