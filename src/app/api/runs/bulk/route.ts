import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeTestRunsParallel } from "@/lib/engine/parallel-executor";
import { z } from "zod/v4";

const bulkRunSchema = z.object({
  testIds: z.array(z.string()).min(1),
  projectId: z.string(),
  baseUrl: z.string().optional(),
  environmentId: z.string().optional(),
  concurrency: z.number().min(1).max(10).optional().default(4),
  recordVideo: z.boolean().optional().default(false),
  recordHar: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = bulkRunSchema.parse(body);

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

    const runs = await Promise.all(
      data.testIds.map((testId) =>
        db.testRun.create({
          data: {
            testId,
            projectId: data.projectId,
            baseUrl,
            environmentId: data.environmentId,
            userId: session.user!.id,
            recordVideo: data.recordVideo,
          },
        })
      )
    );

    const runIds = runs.map((r) => r.id);

    executeTestRunsParallel({
      runIds,
      testIds: data.testIds,
      baseUrl,
      projectId: data.projectId,
      environmentId: data.environmentId,
      concurrency: data.concurrency,
      recordVideo: data.recordVideo,
      recordHar: data.recordHar,
    }).catch((err) => {
      console.error("Parallel execution error:", err);
    });

    return NextResponse.json(
      { runs: runs.map((r) => ({ id: r.id, testId: r.testId })) },
      { status: 201 }
    );
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
