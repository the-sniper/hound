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
  const metric = searchParams.get("metric") || "LCP";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const runs = await db.testRun.findMany({
    where: {
      projectId,
      status: { in: ["PASSED", "FAILED"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      performanceMetrics: {
        where: { name: metric },
        select: { value: true, overBudget: true },
      },
    },
  });

  const trendData = runs
    .filter((r) => r.performanceMetrics.length > 0)
    .map((r) => ({
      runId: r.id,
      date: r.createdAt,
      value: r.performanceMetrics[0].value,
      overBudget: r.performanceMetrics[0].overBudget,
    }))
    .reverse();

  return NextResponse.json({ metric, trendData });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await request.json();

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      perfBudgetLcp: body.lcp ?? undefined,
      perfBudgetCls: body.cls ?? undefined,
      perfBudgetInp: body.inp ?? undefined,
      perfBudgetTtfb: body.ttfb ?? undefined,
    },
  });

  return NextResponse.json({
    budgets: {
      lcp: project.perfBudgetLcp,
      cls: project.perfBudgetCls,
      inp: project.perfBudgetInp,
      ttfb: project.perfBudgetTtfb,
    },
  });
}
