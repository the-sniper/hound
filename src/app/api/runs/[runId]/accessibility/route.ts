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

  const results = await db.accessibilityResult.findMany({
    where: { runId },
    orderBy: [{ impact: "desc" }, { createdAt: "asc" }],
  });

  const run = await db.testRun.findUnique({
    where: { id: runId },
    select: { accessibilityScore: true },
  });

  return NextResponse.json({
    score: run?.accessibilityScore ?? null,
    results,
    summary: {
      total: results.length,
      critical: results.filter((r) => r.impact === "critical").length,
      serious: results.filter((r) => r.impact === "serious").length,
      moderate: results.filter((r) => r.impact === "moderate").length,
      minor: results.filter((r) => r.impact === "minor").length,
    },
  });
}
