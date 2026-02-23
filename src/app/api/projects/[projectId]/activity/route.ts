import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const cursor = searchParams.get("cursor");

  const where: Record<string, unknown> = { projectId };
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const logs = await db.activityLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    logs,
    nextCursor:
      logs.length === limit
        ? logs[logs.length - 1].createdAt.toISOString()
        : null,
  });
}
