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

  const findings = await db.securityFinding.findMany({
    where: { runId },
    orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
  });

  const run = await db.testRun.findUnique({
    where: { id: runId },
    select: { securityGrade: true },
  });

  return NextResponse.json({
    grade: run?.securityGrade ?? null,
    findings,
    summary: {
      total: findings.length,
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
      info: findings.filter((f) => f.severity === "info").length,
    },
  });
}
