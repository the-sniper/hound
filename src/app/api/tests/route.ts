import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { RunStatus } from "@/generated/prisma";

const createTestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string(),
  steps: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        config: z.record(z.string(), z.unknown()).default({}),
        orderIndex: z.number(),
      })
    )
    .default([]),
});

// Calculate health metrics for a test based on recent runs
function calculateHealthMetrics(runs: { status: RunStatus; createdAt: Date }[]) {
  if (runs.length === 0) {
    return {
      passRate: null,
      flakiness: null,
      trend: "unknown" as const,
      totalRuns: 0,
      passedRuns: 0,
      failedRuns: 0,
    };
  }

  // Filter to completed runs only (PASSED, FAILED, ERROR)
  const completedRuns = runs.filter(
    (r) => r.status === "PASSED" || r.status === "FAILED" || r.status === "ERROR"
  );

  if (completedRuns.length === 0) {
    return {
      passRate: null,
      flakiness: null,
      trend: "unknown" as const,
      totalRuns: 0,
      passedRuns: 0,
      failedRuns: 0,
    };
  }

  const passedRuns = completedRuns.filter((r) => r.status === "PASSED").length;
  const failedRuns = completedRuns.length - passedRuns;
  const passRate = Math.round((passedRuns / completedRuns.length) * 100);

  // Calculate flakiness: a test is flaky if it has both passed and failed in recent runs
  // Flakiness score = (number of status changes / total transitions) * 100
  let statusChanges = 0;
  let transitions = 0;
  for (let i = 0; i < completedRuns.length - 1; i++) {
    const current = completedRuns[i].status === "PASSED" ? "pass" : "fail";
    const next = completedRuns[i + 1].status === "PASSED" ? "pass" : "fail";
    if (current !== next) {
      statusChanges++;
    }
    transitions++;
  }
  const flakiness = transitions > 0 ? Math.round((statusChanges / transitions) * 100) : 0;

  // Calculate trend: compare first half vs second half of runs (chronologically)
  // Runs are in desc order (newest first), so reverse to get chronological
  const chronological = [...completedRuns].reverse();
  const midPoint = Math.floor(chronological.length / 2);
  const firstHalf = chronological.slice(0, midPoint || 1);
  const secondHalf = chronological.slice(midPoint || 1);

  const firstHalfPassRate =
    firstHalf.length > 0
      ? firstHalf.filter((r) => r.status === "PASSED").length / firstHalf.length
      : 0;
  const secondHalfPassRate =
    secondHalf.length > 0
      ? secondHalf.filter((r) => r.status === "PASSED").length / secondHalf.length
      : 0;

  let trend: "improving" | "stable" | "declining" | "unknown" = "unknown";
  if (secondHalf.length > 0) {
    const diff = secondHalfPassRate - firstHalfPassRate;
    if (diff > 0.15) trend = "improving";
    else if (diff < -0.15) trend = "declining";
    else trend = "stable";
  }

  return {
    passRate,
    flakiness,
    trend,
    totalRuns: completedRuns.length,
    passedRuns,
    failedRuns,
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const tests = await db.test.findMany({
    where: { projectId },
    include: {
      _count: { select: { steps: true, runs: true } },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 10, // Get last 10 runs for health calculations
        select: { status: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate health metrics for each test
  const testsWithHealth = tests.map((test) => ({
    ...test,
    health: calculateHealthMetrics(test.runs),
  }));

  return NextResponse.json(testsWithHealth);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createTestSchema.parse(body);

    const test = await db.test.create({
      data: {
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        steps: {
          create: data.steps.map((step, index) => ({
            type: step.type as never,
            description: step.description,
            config: JSON.stringify(step.config),
            orderIndex: step.orderIndex ?? index,
          })),
        },
      },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
