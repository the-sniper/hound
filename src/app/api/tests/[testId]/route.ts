import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { RunStatus } from "@prisma/client";

const updateTestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string(),
        description: z.string(),
        config: z.record(z.string(), z.unknown()).default({}),
        orderIndex: z.number(),
      })
    )
    .optional(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  const test = await db.test.findUnique({
    where: { id: testId },
    include: {
      steps: { orderBy: { orderIndex: "asc" } },
      project: { select: { id: true, name: true, baseUrl: true } },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, createdAt: true, duration: true },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  // Calculate health metrics
  const health = calculateHealthMetrics(test.runs);

  // Parse step configs from JSON string to object
  const stepsWithParsedConfig = test.steps.map((step) => ({
    ...step,
    config: step.config ? JSON.parse(step.config) : {},
  }));

  return NextResponse.json({
    ...test,
    steps: stepsWithParsedConfig,
    health,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  try {
    const body = await request.json();
    const data = updateTestSchema.parse(body);

    // If steps are provided, replace all steps
    if (data.steps) {
      await db.testStep.deleteMany({ where: { testId } });
      await db.testStep.createMany({
        data: data.steps.map((step, index) => ({
          testId,
          type: step.type as never,
          description: step.description,
          config: JSON.stringify(step.config),
          orderIndex: step.orderIndex ?? index,
        })),
      });
    }

    const test = await db.test.update({
      where: { id: testId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.status && { status: data.status }),
      },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    // Parse step configs from JSON string to object
    const stepsWithParsedConfig = test.steps.map((step) => ({
      ...step,
      config: step.config ? JSON.parse(step.config) : {},
    }));

    return NextResponse.json({ ...test, steps: stepsWithParsedConfig });
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  await db.test.delete({ where: { id: testId } });

  return NextResponse.json({ success: true });
}
