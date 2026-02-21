import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const updateTestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string(),
        description: z.string(),
        config: z.record(z.string(), z.unknown()).default({}),
        orderIndex: z.number(),
      })
    )
    .optional(),
});

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
      project: { select: { id: true, name: true, baseUrl: true } },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json(test);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  try {
    const body = await request.json();
    const data = updateTestSchema.parse(body);

    // If steps are provided, replace all steps
    if (data.steps) {
      await db.testStep.deleteMany({ where: { testId } });
      await db.testStep.createMany({
        data: data.steps.map((step, index) => ({
          testId,
          type: step.type as never,
          description: step.description,
          config: step.config,
          orderIndex: step.orderIndex ?? index,
        })),
      });
    }

    const test = await db.test.update({
      where: { id: testId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.status && { status: data.status }),
      },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    return NextResponse.json(test);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  await db.test.delete({ where: { id: testId } });

  return NextResponse.json({ success: true });
}
