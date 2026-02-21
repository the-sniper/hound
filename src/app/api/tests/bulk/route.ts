import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeTestRun } from "@/lib/engine/executor";
import { z } from "zod/v4";

const bulkOperationSchema = z.object({
  operation: z.enum(["run", "delete"]),
  testIds: z.array(z.string()).min(1),
  projectId: z.string(),
  environmentId: z.string().optional(),
});

/**
 * POST /api/tests/bulk
 * Perform bulk operations on tests (run or delete)
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = bulkOperationSchema.parse(body);

    const { operation, testIds, projectId, environmentId } = data;

    // Get project for baseUrl
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (operation === "delete") {
      // Bulk delete
      const results = await Promise.allSettled(
        testIds.map((testId) =>
          db.test.delete({ where: { id: testId } })
        )
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return NextResponse.json({
        operation: "delete",
        total: testIds.length,
        successful,
        failed,
      });
    }

    if (operation === "run") {
      // Bulk run - create runs for all tests and start execution
      const runs = [];

      for (const testId of testIds) {
        try {
          const run = await db.testRun.create({
            data: {
              testId,
              projectId,
              baseUrl: project.baseUrl,
              environmentId,
            },
          });

          runs.push({
            runId: run.id,
            testId,
            status: "created",
          });

          // Start execution in background
          executeTestRun({
            runId: run.id,
            testId,
            baseUrl: project.baseUrl,
            projectId,
            environmentId,
          }).catch((err) => {
            console.error(`Bulk test execution error for ${testId}:`, err);
            db.testRun
              .update({
                where: { id: run.id },
                data: { status: "ERROR", completedAt: new Date() },
              })
              .catch(console.error);
          });
        } catch (error) {
          runs.push({
            testId,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return NextResponse.json({
        operation: "run",
        total: testIds.length,
        runs,
      });
    }

    return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Bulk operation failed:", error);
    return NextResponse.json(
      { error: "Bulk operation failed" },
      { status: 500 }
    );
  }
}
