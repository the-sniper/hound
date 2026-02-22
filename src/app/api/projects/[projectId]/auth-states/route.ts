import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const authStates = await db.authState.findMany({
    where: { projectId },
    select: {
      id: true,
      name: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(authStates);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await request.json();
  const { name, stateData, expiresInHours = 24 } = body;

  if (!name || !stateData) {
    return NextResponse.json(
      { error: "name and stateData are required" },
      { status: 400 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const authState = await db.authState.upsert({
    where: { projectId_name: { projectId, name } },
    update: { stateData, expiresAt },
    create: { name, stateData, projectId, expiresAt },
  });

  return NextResponse.json(authState, { status: 201 });
}
