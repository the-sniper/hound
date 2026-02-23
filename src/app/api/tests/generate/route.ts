import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTest, generateTestFromUrl, refineTest } from "@/lib/ai/test-generator";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, description, mode, targetUrl, pageContent, existingTest, feedback } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { anthropicKey: true, openaiKey: true },
  });

  try {
    if (mode === "from_url") {
      if (!targetUrl) {
        return NextResponse.json({ error: "targetUrl required for from_url mode" }, { status: 400 });
      }
      const tests = await generateTestFromUrl(
        targetUrl,
        pageContent || "",
        user?.anthropicKey,
        user?.openaiKey
      );
      return NextResponse.json({ tests });
    }

    if (mode === "refine") {
      if (!existingTest || !feedback) {
        return NextResponse.json({ error: "existingTest and feedback required for refine mode" }, { status: 400 });
      }
      const refined = await refineTest(
        existingTest,
        feedback,
        user?.anthropicKey,
        user?.openaiKey
      );
      return NextResponse.json({ test: refined });
    }

    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const test = await generateTest(
      description,
      project.baseUrl,
      user?.anthropicKey,
      user?.openaiKey
    );
    return NextResponse.json({ test });
  } catch (error) {
    return NextResponse.json(
      { error: `Generation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
