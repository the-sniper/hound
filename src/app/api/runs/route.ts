import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeTestRun } from "@/lib/engine/executor";
import { z } from "zod/v4";

const createRunSchema = z.object({
  testId: z.string(),
  projectId: z.string(),
  baseUrl: z.string().optional(),
  environmentId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const testId = request.nextUrl.searchParams.get("testId");

  const where: Record<string, string> = {};
  if (projectId) where.projectId = projectId;
  if (testId) where.testId = testId;

  const runs = await db.testRun.findMany({
    where,
    include: {
      test: { select: { id: true, name: true } },
      _count: { select: { results: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(runs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createRunSchema.parse(body);

    // Get project for default baseUrl
    const project = await db.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const baseUrl = data.baseUrl || project.baseUrl;

    // Check test has steps
    const test = await db.test.findUnique({
      where: { id: data.testId },
      include: { steps: { take: 1 } },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }

    if (test.steps.length === 0) {
      return NextResponse.json(
        { error: "Test has no steps. Add steps before running." },
        { status: 400 }
      );
    }

    const run = await db.testRun.create({
      data: {
        testId: data.testId,
        projectId: data.projectId,
        baseUrl,
        environmentId: data.environmentId,
      },
    });

    // Start execution in background (fire-and-forget)
    executeTestRun({
      runId: run.id,
      testId: data.testId,
      baseUrl,
      projectId: data.projectId,
      environmentId: data.environmentId,
    }).catch((err) => {
      console.error("Test execution error:", err);
      db.testRun
        .update({
          where: { id: run.id },
          data: { status: "ERROR", completedAt: new Date() },
        })
        .catch(console.error);
    });

    return NextResponse.json(run, { status: 201 });
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
