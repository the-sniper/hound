import os from "os";
import path from "path";
import type { Page } from "playwright";
import { getBrowser } from "./browser-pool";
import { stepHandlers } from "./step-handlers";
import { captureScreenshot } from "./screenshot";
import { runEventBus } from "./events";
import { analyzeFailure } from "@/lib/ai/failure-agent";
import { suggestRecovery, type RecoveryAction } from "@/lib/ai/recovery-agent";
import { db } from "@/lib/db";
import type { StepConfig } from "@/types/test";

interface ExecutorOptions {
  runId: string;
  testId: string;
  baseUrl: string;
  projectId: string;
  environmentId?: string;
  recordVideo?: boolean;
  recordHar?: boolean;
}

/**
 * Substitute variables in a string using the format ${variableName}
 * Variables are looked up from the environment variables and process env
 */
export function substituteVariables(
  value: string,
  variables: Record<string, string>
): string {
  return value.replace(/\$\{(\w+)\}/g, (match, varName) => {
    // First check environment variables
    if (variables[varName] !== undefined) {
      return variables[varName];
    }
    // Fall back to process.env
    if (process.env[varName] !== undefined) {
      return process.env[varName]!;
    }
    // Return original if not found
    return match;
  });
}

/**
 * Substitute variables in step config object
 */
function substituteVariablesInConfig(
  config: StepConfig,
  variables: Record<string, string>
): StepConfig {
  const substituted: StepConfig = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      substituted[key] = substituteVariables(value, variables);
    } else if (typeof value === "object" && value !== null) {
      // Recursively substitute in nested objects
      substituted[key] = JSON.parse(
        substituteVariables(JSON.stringify(value), variables)
      );
    } else {
      substituted[key] = value;
    }
  }

  return substituted;
}

async function executeRecoveryAction(page: Page, recovery: RecoveryAction): Promise<void> {
  switch (recovery.action) {
    case "dismiss_modal":
      if (recovery.selector) {
        try {
          await page.locator(recovery.selector).click({ timeout: 3000 });
        } catch {
          await page.keyboard.press("Escape");
        }
      } else {
        await page.keyboard.press("Escape");
      }
      break;
    case "wait_for_element":
      if (recovery.selector) {
        await page.locator(recovery.selector).waitFor({ timeout: recovery.waitMs ?? 5000 });
      } else {
        await page.waitForTimeout(recovery.waitMs ?? 2000);
      }
      break;
    case "scroll_into_view":
      if (recovery.selector) {
        await page.locator(recovery.selector).scrollIntoViewIfNeeded({ timeout: 3000 });
      }
      break;
    case "refresh_page":
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
      break;
    case "close_popup":
      if (recovery.selector) {
        try {
          await page.locator(recovery.selector).click({ timeout: 3000 });
        } catch {
          await page.keyboard.press("Escape");
        }
      }
      break;
  }
}

export async function executeTestRun(options: ExecutorOptions): Promise<void> {
  const { runId, testId, environmentId, baseUrl } = options;

  await db.testRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const run = await db.testRun.findUnique({
    where: { id: runId },
    include: { user: true },
  });

  const test = await db.test.findUnique({
    where: { id: testId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  if (!test) {
    await db.testRun.update({
      where: { id: runId },
      data: { status: "ERROR", completedAt: new Date() },
    });
    return;
  }

  // Load environment variables
  let variables: Record<string, string> = {};
  if (environmentId) {
    const environment = await db.environment.findUnique({
      where: { id: environmentId },
    });
    if (environment) {
      try {
        variables = JSON.parse(environment.variables as string) as Record<string, string>;
      } catch {
        // Invalid JSON, ignore
      }
    }
  }

  // Substitute variables in baseUrl
  const substitutedBaseUrl = substituteVariables(baseUrl, variables);

  // Update run with environment reference
  await db.testRun.update({
    where: { id: runId },
    data: { environmentId },
  });

  for (const step of test.steps) {
    await db.stepResult.create({
      data: {
        stepId: step.id,
        runId: runId,
        status: "PENDING",
      },
    });
  }

  const browser = await getBrowser();

  const tempDir = path.join(os.tmpdir(), `hound-run-${runId}`);
  const contextOptions: Record<string, unknown> = {
    viewport: { width: 1280, height: 720 },
    userAgent: "Hound/1.0 (Test Automation)",
  };

  if (options.recordVideo) {
    contextOptions.recordVideo = {
      dir: path.join(tempDir, "video"),
      size: { width: 1280, height: 720 },
    };
  }

  if (options.recordHar) {
    const fs = await import("fs");
    await fs.promises.mkdir(path.join(tempDir, "har"), { recursive: true });
    contextOptions.recordHar = {
      path: path.join(tempDir, "har", "network.har"),
      omitContent: false,
    };
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const stepCache = new Map<string, string>();
  const cacheHits = new Map<string, boolean>();
  const startTime = Date.now();
  let runFailed = false;
  const previousSteps: {
    type: string;
    description: string;
    status: string;
  }[] = [];

  try {
    for (const step of test.steps) {
      const stepStart = Date.now();
      
      // Parse config from JSON string
      let config: StepConfig = {};
      if (step.config) {
        try {
          config = typeof step.config === "string" 
            ? JSON.parse(step.config) 
            : (step.config as StepConfig);
        } catch {
          config = {};
        }
      }

      // Apply variable substitution to step config
      config = substituteVariablesInConfig(config, variables);

      runEventBus.emitRunEvent({
        type: "step_start",
        runId,
        stepId: step.id,
        timestamp: Date.now(),
      });

      await db.stepResult.updateMany({
        where: { stepId: step.id, runId },
        data: { status: "RUNNING" },
      });

      try {
        const handler = stepHandlers[step.type];
        if (!handler) {
          throw new Error(`Unknown step type: ${step.type}`);
        }

        const result = await handler(page, config, {
          stepCache,
          anthropicKey: run?.user?.anthropicKey,
          openaiKey: run?.user?.openaiKey,
          projectId: options.projectId,
          branch: null,
          stepId: step.id,
          runId,
          onCacheHit: () => {
            cacheHits.set(step.id, true);
          },
          onCacheMiss: () => {
            cacheHits.set(step.id, false);
          },
        });

        let screenshotUrl: string | null = null;
        try {
          screenshotUrl = await captureScreenshot(page, runId, step.id);
        } catch {
          // Screenshot capture is best-effort
        }

        const stepDuration = Date.now() - stepStart;

        await db.stepResult.updateMany({
          where: { stepId: step.id, runId },
          data: {
            status: "PASSED",
            duration: stepDuration,
            screenshotUrl,
            cacheHit: cacheHits.get(step.id) ?? false,
            aiResponse: result.aiResponse
              ? JSON.stringify(result.aiResponse)
              : undefined,
            logs: result.logs?.length
              ? result.logs.join("\n")
              : undefined,
          },
        });

        runEventBus.emitRunEvent({
          type: "step_complete",
          runId,
          stepId: step.id,
          status: "PASSED",
          screenshotUrl: screenshotUrl ?? undefined,
          duration: stepDuration,
          timestamp: Date.now(),
        });

        previousSteps.push({
          type: step.type,
          description: step.description,
          status: "PASSED",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const maxRetries = (step as Record<string, unknown>).maxRetries as number ?? 0;
        let retryCount = 0;
        let stepPassed = false;

        while (retryCount < maxRetries && !stepPassed) {
          retryCount++;

          runEventBus.emitRunEvent({
            type: "step_retry",
            runId,
            stepId: step.id,
            retryCount,
            error: errorMessage,
            timestamp: Date.now(),
          });

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const accessibility = await (page as any).accessibility?.snapshot?.() ?? {};
            const recoveryContext = {
              pageUrl: page.url(),
              pageTitle: await page.title(),
              accessibilityTree: JSON.stringify(accessibility, null, 2),
              previousSteps,
              anthropicKey: run?.user?.anthropicKey,
              openaiKey: run?.user?.openaiKey,
            };
            const recovery = await suggestRecovery(step.description, step.type, errorMessage, recoveryContext);
            if (recovery.action !== "none" && recovery.confidence > 0.5) {
              await executeRecoveryAction(page, recovery);
            }
          } catch {
            // Recovery is best-effort
          }

          await page.waitForTimeout(1000 * Math.pow(2, retryCount - 1));

          try {
            const handler = stepHandlers[step.type];
            const retryResult = await handler(page, config, {
              stepCache,
              anthropicKey: run?.user?.anthropicKey,
              openaiKey: run?.user?.openaiKey,
              projectId: options.projectId,
              branch: null,
              stepId: step.id,
              runId,
              onCacheHit: () => { cacheHits.set(step.id, true); },
              onCacheMiss: () => { cacheHits.set(step.id, false); },
            });

            let retryScreenshot: string | null = null;
            try { retryScreenshot = await captureScreenshot(page, runId, step.id); } catch { /* best-effort */ }

            const stepDuration = Date.now() - stepStart;
            await db.stepResult.updateMany({
              where: { stepId: step.id, runId },
              data: {
                status: "PASSED",
                duration: stepDuration,
                screenshotUrl: retryScreenshot,
                retryCount,
                cacheHit: cacheHits.get(step.id) ?? false,
                aiResponse: retryResult.aiResponse ? JSON.stringify(retryResult.aiResponse) : undefined,
                logs: retryResult.logs?.length ? retryResult.logs.join("\n") : undefined,
              },
            });

            runEventBus.emitRunEvent({
              type: "step_complete",
              runId,
              stepId: step.id,
              status: "PASSED",
              screenshotUrl: retryScreenshot ?? undefined,
              duration: stepDuration,
              retryCount,
              timestamp: Date.now(),
            });

            previousSteps.push({ type: step.type, description: step.description, status: "PASSED" });
            stepPassed = true;
          } catch {
            // Retry failed, continue loop
          }
        }

        if (!stepPassed) {
          const stepDuration = Date.now() - stepStart;
          let screenshotUrl: string | null = null;
          try { screenshotUrl = await captureScreenshot(page, runId, step.id); } catch { /* best-effort */ }

          await db.stepResult.updateMany({
            where: { stepId: step.id, runId },
            data: {
              status: "FAILED",
              duration: stepDuration,
              screenshotUrl,
              error: errorMessage,
              retryCount,
            },
          });

          runEventBus.emitRunEvent({
            type: "step_error",
            runId,
            stepId: step.id,
            status: "FAILED",
            error: errorMessage,
            screenshotUrl: screenshotUrl ?? undefined,
            duration: stepDuration,
            retryCount,
            timestamp: Date.now(),
          });

          previousSteps.push({ type: step.type, description: step.description, status: "FAILED" });
          runFailed = true;

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const accessibility = await (page as any).accessibility?.snapshot?.() ?? {};
            const aiContext = {
              pageUrl: page.url(),
              pageTitle: await page.title(),
              accessibilityTree: JSON.stringify(accessibility, null, 2),
              previousSteps,
              anthropicKey: run?.user?.anthropicKey,
              openaiKey: run?.user?.openaiKey,
            };
            const analysis = await analyzeFailure(step.description, step.type, errorMessage, aiContext);
            await db.testRun.update({
              where: { id: runId },
              data: { failureAnalysis: JSON.stringify(analysis) },
            });
          } catch {
            // Failure analysis is best-effort
          }

          if (!(test as Record<string, unknown>).continueOnFailure) {
            for (const remainingStep of test.steps) {
              if (remainingStep.orderIndex > step.orderIndex) {
                await db.stepResult.updateMany({
                  where: { stepId: remainingStep.id, runId },
                  data: { status: "SKIPPED" },
                });
              }
            }
            break;
          }
        }
      }
    }
  } finally {
    await context.close();

    const { getArtifactStore } = await import("@/lib/storage");
    const store = getArtifactStore();

    if (options.recordVideo) {
      try {
        const fs = await import("fs");
        const videoDir = path.join(tempDir, "video");
        const files = await fs.promises.readdir(videoDir).catch(() => [] as string[]);
        const videoFile = files.find((f: string) => f.endsWith(".webm"));
        if (videoFile) {
          const videoBuffer = await fs.promises.readFile(path.join(videoDir, videoFile));
          const videoKey = `videos/${runId}/recording.webm`;
          await store.upload(videoKey, videoBuffer, "video/webm");
          const videoUrl = await store.getUrl(videoKey);
          await db.testRun.update({
            where: { id: runId },
            data: { videoUrl },
          });
        }
      } catch (err) {
        console.error("Failed to save video recording:", err);
      }
    }

    if (options.recordHar) {
      try {
        const fs = await import("fs");
        const harPath = path.join(tempDir, "har", "network.har");
        const harBuffer = await fs.promises.readFile(harPath);
        const harKey = `har/${runId}/network.har`;
        await store.upload(harKey, harBuffer, "application/json");
        const harUrl = await store.getUrl(harKey);
        await db.testRun.update({
          where: { id: runId },
          data: { harUrl },
        });
      } catch (err) {
        console.error("Failed to save HAR recording:", err);
      }
    }

    try {
      const fs = await import("fs");
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Cleanup is best-effort
    }
  }

  const totalDuration = Date.now() - startTime;

  await db.testRun.update({
    where: { id: runId },
    data: {
      status: runFailed ? "FAILED" : "PASSED",
      duration: totalDuration,
      completedAt: new Date(),
    },
  });

  runEventBus.emitRunEvent({
    type: "run_complete",
    runId,
    timestamp: Date.now(),
  });
}
