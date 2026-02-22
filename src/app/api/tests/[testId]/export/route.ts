import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exportToPlaywright } from "@/lib/export/playwright-exporter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  const test = await db.test.findUnique({
    where: { id: testId },
    include: {
      steps: { orderBy: { orderIndex: "asc" } },
      project: { select: { baseUrl: true } },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const steps = test.steps.map((step) => ({
    type: step.type,
    description: step.description,
    config: typeof step.config === "string"
      ? JSON.parse(step.config)
      : (step.config as Record<string, unknown>),
  }));

  const code = exportToPlaywright({
    testName: test.name,
    testDescription: test.description || undefined,
    steps,
    baseUrl: test.project.baseUrl,
  });

  const safeFilename = test.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  return new NextResponse(code, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${safeFilename}.spec.ts"`,
    },
  });
}
