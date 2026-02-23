import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { correlateFailureToCode } from "@/lib/analysis/failure-correlator";

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
  const { gitDiff } = body;

  if (!gitDiff) {
    return NextResponse.json({ error: "gitDiff is required" }, { status: 400 });
  }

  const run = await db.testRun.findUnique({
    where: { id: runId },
    include: {
      results: {
        where: { status: "FAILED" },
        include: { step: true },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const failedStep = run.results[0];
  if (!failedStep) {
    return NextResponse.json({ error: "No failed steps found" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { anthropicKey: true, openaiKey: true },
  });

  const result = await correlateFailureToCode(
    {
      stepType: failedStep.step.type,
      stepDescription: failedStep.step.description,
      error: failedStep.error || "Unknown error",
      pageUrl: run.baseUrl,
    },
    gitDiff,
    user?.anthropicKey,
    user?.openaiKey
  );

  return NextResponse.json(result);
}
