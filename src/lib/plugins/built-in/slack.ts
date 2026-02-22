import type { HoundPlugin, PluginContext } from "../plugin-api";

const slackPlugin: HoundPlugin = {
  name: "slack",
  version: "1.0.0",
  description: "Send test run notifications to Slack channels",
  category: "integration",

  reporter: {
    name: "slack-reporter",

    onRunComplete: async (
      runResult: Record<string, unknown>,
      ctx: PluginContext
    ) => {
      const webhookUrl = ctx.config.webhookUrl as string;
      if (!webhookUrl) return;

      const status = runResult.status as string;
      const testName = (runResult.testName as string) || "Unknown test";
      const duration = (runResult.duration as number) || 0;
      const channel = ctx.config.channel as string;

      const color =
        status === "PASSED"
          ? "#36a64f"
          : status === "FAILED"
            ? "#e74c3c"
            : "#f39c12";
      const emoji =
        status === "PASSED"
          ? ":white_check_mark:"
          : status === "FAILED"
            ? ":x:"
            : ":warning:";

      const payload = {
        channel,
        attachments: [
          {
            color,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `${emoji} *${testName}* — ${status}\nDuration: ${(duration / 1000).toFixed(1)}s`,
                },
              },
            ],
          },
        ],
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
  },
};

export default slackPlugin;
