import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const body = await request.json();
  const { assigneeId, note } = body;

  if (!assigneeId) {
    return NextResponse.json(
      { error: "assigneeId is required" },
      { status: 400 }
    );
  }

  const run = await db.testRun.findUnique({
    where: { id: runId },
    select: { projectId: true, testId: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  await logActivity(
    session.user.id,
    run.projectId,
    "failure_assigned",
    "run",
    runId,
    { assigneeId, note: note || null }
  );

  if (note) {
    await db.comment.create({
      data: {
        content: note,
        targetType: "run",
        targetId: runId,
        userId: session.user.id,
        projectId: run.projectId,
      },
    });
  }

  return NextResponse.json({ success: true, assigneeId });
}
