import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Get all runs for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const project = await db.project.findUnique({
    where: {
      id: projectId,
      members: { some: { userId: session.user.id } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const runs = await db.testRun.findMany({
    where: { projectId },
    include: {
      test: {
        select: { id: true, name: true },
      },
      _count: {
        select: { results: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const total = await db.testRun.count({ where: { projectId } });

  return NextResponse.json({ runs, total, limit, offset });
}
