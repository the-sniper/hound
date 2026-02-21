import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/projects/[projectId]/environments/[envId]/default - Set as default
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; envId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, envId } = await params;

  try {
    // First, unset all other environments as default
    await db.environment.updateMany({
      where: { projectId },
      data: { isDefault: false },
    });

    // Set the selected environment as default
    await db.environment.update({
      where: { id: envId },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to set default environment:", error);
    return NextResponse.json(
      { error: "Failed to set default environment" },
      { status: 500 }
    );
  }
}
