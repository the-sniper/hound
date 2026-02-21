import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/projects/[projectId]/environments/[envId]/variables - List variables
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; envId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { envId } = await params;

  const variables = await db.variable.findMany({
    where: { environmentId: envId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(variables);
}

// POST /api/projects/[projectId]/environments/[envId]/variables - Create variable
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; envId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { envId } = await params;
  const { name, value = "" } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Variable name is required" },
      { status: 400 }
    );
  }

  // Validate variable name format
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())) {
    return NextResponse.json(
      { error: "Variable name must be alphanumeric with underscores, starting with letter or underscore" },
      { status: 400 }
    );
  }

  try {
    // Check if variable already exists
    const existing = await db.variable.findUnique({
      where: { environmentId_name: { environmentId: envId, name: name.trim() } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Variable with this name already exists" },
        { status: 400 }
      );
    }

    const variable = await db.variable.create({
      data: {
        name: name.trim(),
        value: value,
        environmentId: envId,
      },
    });

    return NextResponse.json(variable, { status: 201 });
  } catch (error) {
    console.error("Failed to create variable:", error);
    return NextResponse.json(
      { error: "Failed to create variable" },
      { status: 500 }
    );
  }
}
