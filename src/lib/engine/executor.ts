import { getBrowser } from "./browser-pool";
import { stepHandlers } from "./step-handlers";
import { captureScreenshot } from "./screenshot";
import { runEventBus } from "./events";
import { analyzeFailure } from "@/lib/ai/failure-agent";
import { db } from "@/lib/db";
import type { StepConfig } from "@/types/test";

interface ExecutorOptions {
  runId: string;
  testId: string;
  baseUrl: string;
  projectId: string;
}

export async function executeTestRun(options: ExecutorOptions): Promise<void> {
  const { runId, testId } = options;

  await db.testRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: "Hound/1.0 (Test Automation)",
  });
  const page = await context.newPage();

  const stepCache = new Map<string, string>();
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
      const config = step.config as StepConfig;

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

        const result = await handler(page, config, { stepCache });

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
            aiResponse: result.aiResponse
              ? JSON.parse(JSON.stringify(result.aiResponse))
              : undefined,
            logs: result.logs
              ? JSON.parse(JSON.stringify(result.logs))
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
        const stepDuration = Date.now() - stepStart;

        let screenshotUrl: string | null = null;
        try {
          screenshotUrl = await captureScreenshot(page, runId, step.id);
        } catch {
          // Best effort
        }

        await db.stepResult.updateMany({
          where: { stepId: step.id, runId },
          data: {
            status: "FAILED",
            duration: stepDuration,
            screenshotUrl,
            error: errorMessage,
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
          timestamp: Date.now(),
        });

        previousSteps.push({
          type: step.type,
          description: step.description,
          status: "FAILED",
        });

        runFailed = true;

        // Run failure analysis
        try {
          // Get accessibility snapshot with type assertion for Playwright
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const accessibility = await (page as any).accessibility?.snapshot?.() ?? {};
          const aiContext = {
            pageUrl: page.url(),
            pageTitle: await page.title(),
            accessibilityTree: JSON.stringify(accessibility, null, 2),
            previousSteps,
          };
          const analysis = await analyzeFailure(
            step.description,
            step.type,
            errorMessage,
            aiContext
          );
          await db.testRun.update({
            where: { id: runId },
            data: { failureAnalysis: JSON.stringify(analysis) },
          });
        } catch {
          // Failure analysis is best-effort
        }

        // Mark remaining steps as skipped
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
  } finally {
    await context.close();
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
