import crypto from "crypto";
import { db } from "@/lib/db";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export async function sendWebhooks(
  projectId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await db.webhook.findMany({
    where: {
      projectId,
      enabled: true,
    },
  });

  const matchingWebhooks = webhooks.filter((w) => {
    const events = (w.events as string[]) || [];
    return events.includes(event) || events.includes("*");
  });

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    matchingWebhooks.map(async (webhook) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Hound-Webhook/1.0",
        ...((webhook.headers as Record<string, string>) || {}),
      };

      if (webhook.secret) {
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(body)
          .digest("hex");
        headers["X-Hound-Signature"] = `sha256=${signature}`;
      }

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error(`Webhook ${webhook.id} failed: ${response.status}`);
      }
    })
  );
}

export async function notifyRunCompleted(
  projectId: string,
  runId: string,
  status: string,
  testName: string,
  duration: number | null
): Promise<void> {
  const event =
    status === "PASSED"
      ? "run_passed"
      : status === "FAILED"
        ? "run_failed"
        : "run_error";

  await sendWebhooks(projectId, event, {
    runId,
    status,
    testName,
    duration,
  });
}
