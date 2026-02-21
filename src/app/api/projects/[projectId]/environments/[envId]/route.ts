import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/projects/[projectId]/environments/[envId] - Delete environment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; envId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { envId } = await params;

  try {
    const env = await db.environment.findUnique({
      where: { id: envId },
    });

    if (!env) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 }
      );
    }

    await db.environment.delete({
      where: { id: envId },
    });

    // If this was the default, set another env as default
    if (env.isDefault) {
      const anotherEnv = await db.environment.findFirst({
        where: { projectId: env.projectId },
        orderBy: { createdAt: "asc" },
      });

      if (anotherEnv) {
        await db.environment.update({
          where: { id: anotherEnv.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete environment:", error);
    return NextResponse.json(
      { error: "Failed to delete environment" },
      { status: 500 }
    );
  }
}
