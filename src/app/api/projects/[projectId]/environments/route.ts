import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const createEnvironmentSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  variables: z.record(z.string(), z.string()).default({}),
});

const updateEnvironmentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

/**
 * GET /api/projects/[projectId]/environments
 * List all environments for a project
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const environments = await db.environment.findMany({
      where: { projectId },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(environments);
  } catch (error) {
    console.error("Failed to fetch environments:", error);
    return NextResponse.json(
      { error: "Failed to fetch environments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/environments
 * Create a new environment
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const body = await request.json();
    const data = createEnvironmentSchema.parse(body);

    // If this is set as default, unset any existing default
    if (data.isDefault) {
      await db.environment.updateMany({
        where: { projectId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const environment = await db.environment.create({
      data: {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        variables: JSON.stringify(data.variables),
        projectId,
      },
    });

    return NextResponse.json(environment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create environment:", error);
    return NextResponse.json(
      { error: "Failed to create environment" },
      { status: 500 }
    );
  }
}
