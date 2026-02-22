import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Get all runs for a specific test
export async function GET(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const test = await db.test.findUnique({
    where: {
      id: testId,
    },
    include: {
      project: {
        include: {
          members: {
            where: { userId: session.user.id }
          }
        }
      }
    }
  });

  if (!test || test.project.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const runs = await db.testRun.findMany({
    where: { testId },
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

  const total = await db.testRun.count({ where: { testId } });

  return NextResponse.json({ 
    runs, 
    total, 
    limit, 
    offset,
    test: {
      id: test.id,
      name: test.name,
      projectId: test.projectId,
      projectName: test.project.name
    }
  });
}
