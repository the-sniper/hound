import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  compareScreenshots,
  generateComparisonSummary,
  isValidBaseline,
} from "@/lib/engine/visual-diff";
import { join } from "path";

/**
 * Compare screenshots between two test runs
 * GET /api/runs/[runId]/compare?baselineRunId=xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const baselineRunId = searchParams.get("baselineRunId");

  if (!baselineRunId) {
    return NextResponse.json(
      { error: "baselineRunId is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch both runs with their results
    const [currentRun, baselineRun] = await Promise.all([
      db.testRun.findUnique({
        where: { id: runId },
        include: {
          test: { select: { id: true, name: true } },
          results: {
            include: {
              step: { select: { id: true, orderIndex: true, description: true } },
            },
            orderBy: { step: { orderIndex: "asc" } },
          },
        },
      }),
      db.testRun.findUnique({
        where: { id: baselineRunId },
        include: {
          results: {
            include: {
              step: { select: { id: true, orderIndex: true, description: true } },
            },
            orderBy: { step: { orderIndex: "asc" } },
          },
        },
      }),
    ]);

    if (!currentRun || !baselineRun) {
      return NextResponse.json(
        { error: "One or both runs not found" },
        { status: 404 }
      );
    }

    // Check if baseline is valid
    if (!isValidBaseline(baselineRun.status, baselineRun.results)) {
      return NextResponse.json(
        { error: "Baseline run is not valid (must have passed all steps)" },
        { status: 400 }
      );
    }

    // Create a map of stepId -> screenshotUrl for both runs
    const baselineScreenshots = new Map(
      baselineRun.results
        .filter((r) => r.screenshotUrl)
        .map((r) => [r.step.id, r.screenshotUrl])
    );

    const currentScreenshots = currentRun.results.filter((r) => r.screenshotUrl);

    if (currentScreenshots.length === 0) {
      return NextResponse.json(
        { error: "No screenshots available in current run" },
        { status: 400 }
      );
    }

    // Compare screenshots
    const diffResultsDir = join("public", "screenshots", "diffs", runId);
    const comparisonResults = [];

    for (const currentResult of currentScreenshots) {
      const stepId = currentResult.step.id;
      const baselineScreenshot = baselineScreenshots.get(stepId);

      if (!baselineScreenshot) {
        comparisonResults.push({
          stepId,
          stepIndex: currentResult.step.orderIndex + 1,
          stepDescription: currentResult.step.description,
          hasBaseline: false,
          hasCurrent: true,
          result: null,
        });
        continue;
      }

      try {
        const diffResult = await compareScreenshots(
          baselineScreenshot,
          currentResult.screenshotUrl!,
          diffResultsDir
        );

        comparisonResults.push({
          stepId,
          stepIndex: currentResult.step.orderIndex + 1,
          stepDescription: currentResult.step.description,
          hasBaseline: true,
          hasCurrent: true,
          baselineScreenshot,
          currentScreenshot: currentResult.screenshotUrl,
          result: diffResult,
        });
      } catch (error) {
        console.error(`Failed to compare step ${stepId}:`, error);
        comparisonResults.push({
          stepId,
          stepIndex: currentResult.step.orderIndex + 1,
          stepDescription: currentResult.step.description,
          hasBaseline: true,
          hasCurrent: true,
          error: "Failed to compare screenshots",
        });
      }
    }

    // Generate summary (only for successful comparisons)
    const successfulComparisons = comparisonResults
      .filter((c) => c.result)
      .map((c) => c.result);

    const summary = generateComparisonSummary(
      baselineRunId,
      runId,
      successfulComparisons
    );

    return NextResponse.json({
      baselineRun: {
        id: baselineRun.id,
        status: baselineRun.status,
        createdAt: baselineRun.createdAt,
      },
      currentRun: {
        id: currentRun.id,
        status: currentRun.status,
        testName: currentRun.test.name,
        createdAt: currentRun.createdAt,
      },
      summary,
      comparisons: comparisonResults,
    });
  } catch (error) {
    console.error("Comparison failed:", error);
    return NextResponse.json(
      { error: "Failed to compare runs" },
      { status: 500 }
    );
  }
}

/**
 * Get available baseline runs for a test
 * POST /api/runs/[runId]/compare/baselines
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  try {
    const currentRun = await db.testRun.findUnique({
      where: { id: runId },
      select: { testId: true },
    });

    if (!currentRun) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Find potential baseline runs (passed status, has screenshots)
    const baselineRuns = await db.testRun.findMany({
      where: {
        testId: currentRun.testId,
        status: "PASSED",
        id: { not: runId },
        results: {
          some: {
            screenshotUrl: { not: null },
            status: "PASSED",
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        createdAt: true,
        _count: { select: { results: true } },
      },
    });

    return NextResponse.json({ baselineRuns });
  } catch (error) {
    console.error("Failed to fetch baseline runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch baseline runs" },
      { status: 500 }
    );
  }
}
