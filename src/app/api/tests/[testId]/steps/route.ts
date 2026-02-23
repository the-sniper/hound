import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const stepTypeEnum = z.enum([
  "NAVIGATE",
  "CLICK",
  "TYPE",
  "WAIT",
  "WAIT_FOR_URL",
  "ASSERT_TEXT",
  "ASSERT_ELEMENT",
  "ASSERT_VISUAL",
  "AI_CHECK",
  "AI_EXTRACT",
  "AI_ACTION",
  "JAVASCRIPT",
  "SCREENSHOT",
  "HOVER",
  "SELECT",
  "PRESS_KEY",
  "SCROLL",
  "SAVE_AUTH",
  "LOAD_AUTH",
  "MOCK_ROUTE",
  "REMOVE_MOCK",
  "CONDITIONAL",
  "SKIP_IF",
  "ASSERT_ACCESSIBLE",
  "SECURITY_SCAN",
]);

const createStepSchema = z.object({
  type: stepTypeEnum,
  description: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
});

const updateStepsSchema = z.array(
  z.object({
    id: z.string(),
    orderIndex: z.number().int(),
    type: stepTypeEnum,
    description: z.string(),
    config: z.record(z.string(), z.unknown()),
  })
);

// Get all steps for a test
export async function GET(
  request: Request,
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
      project: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!test || test.project.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const steps = await db.testStep.findMany({
    where: { testId },
    orderBy: { orderIndex: "asc" },
    include: {
      caches: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // No need to parse config, Prisma already returns it as an object
  const stepsWithParsedConfig = steps;

  return NextResponse.json(stepsWithParsedConfig);
}

// Create a new step
export async function POST(
  request: Request,
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
      project: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!test || test.project.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = createStepSchema.parse(body);

    // Get current max order index
    const lastStep = await db.testStep.findFirst({
      where: { testId },
      orderBy: { orderIndex: "desc" },
    });

    const orderIndex = lastStep ? lastStep.orderIndex + 1 : 0;

    const step = await db.testStep.create({
      data: {
        type: data.type,
        description: data.description,
        config: data.config as any,
        testId,
        orderIndex,
      },
    });

    // Auto-update test status from DRAFT to ACTIVE when first step is added
    if (test.status === "DRAFT") {
      await db.test.update({
        where: { id: testId },
        data: { status: "ACTIVE" },
      });
    }

    // Return with parsed config
    return NextResponse.json({
      ...step,
      config: data.config,
    }, { status: 201 });
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

// Bulk update steps (reordering and editing)
export async function PUT(
  request: Request,
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
      project: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!test || test.project.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const steps = updateStepsSchema.parse(body);

    // Use transaction to update all steps
    const updatedSteps = await db.$transaction(
      steps.map((step) =>
        db.testStep.update({
          where: { id: step.id, testId },
          data: {
            orderIndex: step.orderIndex,
            type: step.type,
            description: step.description,
            config: step.config as any,
          },
        })
      )
    );

    // No need to parse config, Prisma already returns it as an object
    const stepsWithParsedConfig = updatedSteps;

    return NextResponse.json(stepsWithParsedConfig);
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

// Delete all steps (for a test) or specific step
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;
  const { searchParams } = new URL(request.url);
  const stepId = searchParams.get("stepId");

  const test = await db.test.findUnique({
    where: { id: testId },
    include: {
      project: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!test || test.project.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (stepId) {
    // Delete specific step
    await db.testStep.delete({
      where: { id: stepId, testId },
    });

    // Reorder remaining steps
    const remainingSteps = await db.testStep.findMany({
      where: { testId },
      orderBy: { orderIndex: "asc" },
    });

    await db.$transaction(
      remainingSteps.map((step, index) =>
        db.testStep.update({
          where: { id: step.id },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } else {
    // Delete all steps
    await db.testStep.deleteMany({
      where: { testId },
    });

    return NextResponse.json({ success: true });
  }
}
