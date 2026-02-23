import { Command } from "commander";
import { apiRequest } from "../client";
import { formatJunit, formatJson } from "../reporters";

interface RunResult {
  id: string;
  status: string;
  duration: number | null;
  baseUrl: string;
  testId: string;
  createdAt: string;
  test: { id: string; name: string };
  results: {
    id: string;
    status: string;
    duration: number | null;
    error: string | null;
    cacheHit: boolean;
    retryCount: number;
    step: {
      id: string;
      orderIndex: number;
      type: string;
      description: string;
    };
  }[];
}

export const runCommand = new Command("run")
  .description("Run tests")
  .requiredOption("--project <id>", "Project ID")
  .option("--test <id>", "Specific test ID (runs all if omitted)")
  .option("--reporter <type>", "Output format: text, json, junit", "text")
  .option("--record-video", "Record video of test execution")
  .option("--record-har", "Capture network traffic")
  .action(async (options) => {
    try {
      let testIds: string[] = [];

      if (options.test) {
        testIds = [options.test];
      } else {
        const tests = await apiRequest<{ id: string }[]>(
          "GET",
          `/tests?projectId=${options.project}`
        );
        testIds = tests.map((t) => t.id);
      }

      if (testIds.length === 0) {
        console.log("No tests to run.");
        process.exit(0);
      }

      const allResults: RunResult[] = [];
      let hasFailures = false;

      for (const testId of testIds) {
        const run = await apiRequest<{ id: string }>("POST", "/runs", {
          testId,
          projectId: options.project,
          recordVideo: options.recordVideo || false,
          recordHar: options.recordHar || false,
        });

        if (options.reporter === "text") {
          process.stdout.write(`  Running test ${testId}...`);
        }

        const result = await pollRun(run.id);
        allResults.push(result);

        if (result.status === "FAILED" || result.status === "ERROR") {
          hasFailures = true;
        }

        if (options.reporter === "text") {
          const icon =
            result.status === "PASSED"
              ? "✓"
              : result.status === "FAILED"
                ? "✗"
                : "!";
          const dur = result.duration
            ? `${(result.duration / 1000).toFixed(1)}s`
            : "?";
          process.stdout.write(`\r  ${icon} ${result.test.name} (${dur})\n`);

          if (result.status === "FAILED") {
            for (const r of result.results) {
              if (r.status === "FAILED" && r.error) {
                console.log(
                  `    Step ${r.step.orderIndex + 1} [${r.step.type}]: ${r.error}`
                );
              }
            }
          }
        }
      }

      if (options.reporter === "text") {
        const passed = allResults.filter((r) => r.status === "PASSED").length;
        const failed = allResults.filter((r) => r.status === "FAILED").length;
        const errors = allResults.filter((r) => r.status === "ERROR").length;
        console.log(
          `\n  ${passed} passed, ${failed} failed, ${errors} errors\n`
        );
      } else if (options.reporter === "json") {
        console.log(formatJson(allResults));
      } else if (options.reporter === "junit") {
        console.log(formatJunit(allResults));
      }

      process.exit(hasFailures ? 1 : 0);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(2);
    }
  });

async function pollRun(runId: string): Promise<RunResult> {
  const maxWait = 300000;
  const pollInterval = 2000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const run = await apiRequest<RunResult>("GET", `/runs/${runId}`);
    if (run.status !== "PENDING" && run.status !== "RUNNING") {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Run ${runId} timed out after ${maxWait / 1000}s`);
}
