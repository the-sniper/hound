import { executeTestRun } from "./executor";
import { db } from "@/lib/db";

interface ParallelExecutorOptions {
  runIds: string[];
  testIds: string[];
  baseUrl: string;
  projectId: string;
  environmentId?: string;
  concurrency?: number;
  recordVideo?: boolean;
  recordHar?: boolean;
}

interface ParallelResult {
  runId: string;
  testId: string;
  status: "PASSED" | "FAILED" | "ERROR";
  duration: number | null;
}

export async function executeTestRunsParallel(
  options: ParallelExecutorOptions
): Promise<ParallelResult[]> {
  const concurrency = options.concurrency ?? 4;
  const results: ParallelResult[] = [];
  const queue = options.runIds.map((runId, i) => ({
    runId,
    testId: options.testIds[i],
  }));

  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    workers.push(runWorker(queue, results, options));
  }

  await Promise.all(workers);
  return results;
}

async function runWorker(
  queue: { runId: string; testId: string }[],
  results: ParallelResult[],
  options: ParallelExecutorOptions
): Promise<void> {
  while (true) {
    const item = queue.shift();
    if (!item) break;

    const startTime = Date.now();
    try {
      await executeTestRun({
        runId: item.runId,
        testId: item.testId,
        baseUrl: options.baseUrl,
        projectId: options.projectId,
        environmentId: options.environmentId,
        recordVideo: options.recordVideo,
        recordHar: options.recordHar,
      });

      const run = await db.testRun.findUnique({
        where: { id: item.runId },
        select: { status: true, duration: true },
      });

      results.push({
        runId: item.runId,
        testId: item.testId,
        status: (run?.status as "PASSED" | "FAILED" | "ERROR") ?? "ERROR",
        duration: run?.duration ?? null,
      });
    } catch (error) {
      console.error(`Parallel run ${item.runId} error:`, error);

      await db.testRun
        .update({
          where: { id: item.runId },
          data: {
            status: "ERROR",
            completedAt: new Date(),
            duration: Date.now() - startTime,
          },
        })
        .catch(() => {});

      results.push({
        runId: item.runId,
        testId: item.testId,
        status: "ERROR",
        duration: Date.now() - startTime,
      });
    }
  }
}
