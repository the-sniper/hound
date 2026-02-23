import type { HoundPlugin, PluginContext } from "../plugin-api";

const jiraPlugin: HoundPlugin = {
  name: "jira",
  version: "1.0.0",
  description: "Create Jira tickets for failed test runs",
  category: "integration",

  reporter: {
    name: "jira-reporter",

    onRunComplete: async (runResult: Record<string, unknown>, ctx: PluginContext) => {
      const status = runResult.status as string;
      if (status !== "FAILED") return;

      const baseUrl = ctx.config.baseUrl as string;
      const email = ctx.config.email as string;
      const apiToken = ctx.config.apiToken as string;
      const projectKey = ctx.config.projectKey as string;

      if (!baseUrl || !email || !apiToken || !projectKey) return;

      const testName = (runResult.testName as string) || "Unknown test";
      const runId = (runResult.id as string) || "";
      const steps =
        (runResult.steps as { status: string; description: string; error?: string }[]) || [];

      const failedSteps = steps.filter((s) => s.status === "FAILED");
      let description = `Test "${testName}" failed (Run: ${runId})\n\n`;
      description += "h3. Failed Steps\n";
      for (const step of failedSteps) {
        description += `* ${step.description}`;
        if (step.error) description += `\n** Error: ${step.error}`;
        description += "\n";
      }

      const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

      await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            summary: `[Hound] Test failed: ${testName}`,
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: description }],
                },
              ],
            },
            issuetype: { name: "Bug" },
          },
        }),
      });
    },
  },
};

export default jiraPlugin;
