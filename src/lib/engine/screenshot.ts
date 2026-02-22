import type { Page } from "playwright";
import { getArtifactStore } from "@/lib/storage";

export async function captureScreenshot(
  page: Page,
  runId: string,
  stepId: string
): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false });
  const filename = `${stepId}-${Date.now()}.png`;
  const key = `screenshots/${runId}/${filename}`;

  const store = getArtifactStore();
  await store.upload(key, buffer, "image/png");
  return await store.getUrl(key);
}

export async function captureScreenshotBase64(page: Page): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false });
  return buffer.toString("base64");
}
