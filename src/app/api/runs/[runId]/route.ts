import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  const run = await db.testRun.findUnique({
    where: { id: runId },
    include: {
      test: { select: { id: true, name: true } },
      results: {
        select: {
          id: true,
          status: true,
          duration: true,
          screenshotUrl: true,
          error: true,
          logs: true,
          aiResponse: true,
          cacheHit: true,
          retryCount: true,
          step: {
            select: {
              id: true,
              orderIndex: true,
              type: true,
              description: true,
              config: true,
              maxRetries: true,
            },
          },
        },
        orderBy: { step: { orderIndex: "asc" } },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
