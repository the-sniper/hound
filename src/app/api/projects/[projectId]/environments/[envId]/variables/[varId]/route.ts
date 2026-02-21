import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/projects/[projectId]/environments/[envId]/variables/[varId] - Update variable
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string; envId: string; varId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { varId } = await params;
  const { value } = await request.json();

  try {
    const variable = await db.variable.update({
      where: { id: varId },
      data: { value: value ?? "" },
    });

    return NextResponse.json(variable);
  } catch (error) {
    console.error("Failed to update variable:", error);
    return NextResponse.json(
      { error: "Failed to update variable" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/environments/[envId]/variables/[varId] - Delete variable
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; envId: string; varId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { varId } = await params;

  try {
    await db.variable.delete({
      where: { id: varId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete variable:", error);
    return NextResponse.json(
      { error: "Failed to delete variable" },
      { status: 500 }
    );
  }
}
