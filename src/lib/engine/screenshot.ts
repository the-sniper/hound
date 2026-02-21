import { mkdir } from "fs/promises";
import { join } from "path";
import type { Page } from "playwright";

const SCREENSHOT_DIR = join(process.cwd(), "public", "screenshots");

export async function captureScreenshot(
  page: Page,
  runId: string,
  stepId: string
): Promise<string> {
  const dir = join(SCREENSHOT_DIR, runId);
  await mkdir(dir, { recursive: true });

  const filename = `${stepId}-${Date.now()}.png`;
  const filepath = join(dir, filename);

  await page.screenshot({ path: filepath, fullPage: false });

  return `/screenshots/${runId}/${filename}`;
}

export async function captureScreenshotBase64(page: Page): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false });
  return buffer.toString("base64");
}
