import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCacheStats } from "@/lib/engine/step-cache";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  const stats = await getCacheStats(projectId);
  return NextResponse.json(stats);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  const result = await db.stepCache.deleteMany({ where: { projectId } });
  return NextResponse.json({ deleted: result.count });
}
