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

  const metrics = await db.performanceMetric.findMany({
    where: { runId },
    orderBy: { name: "asc" },
  });

  const vitals = metrics.filter((m) =>
    ["LCP", "CLS", "FCP", "TTFB", "INP"].includes(m.name)
  );
  const network = metrics.filter((m) =>
    ["DNS", "TCP", "TLS", "Download", "PageLoad"].includes(m.name)
  );
  const overBudget = metrics.filter((m) => m.overBudget);

  return NextResponse.json({
    metrics,
    vitals,
    network,
    overBudget,
    summary: {
      total: metrics.length,
      overBudgetCount: overBudget.length,
    },
  });
}
