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

  const installs = await db.projectPlugin.findMany({
    where: { projectId },
    include: { plugin: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(installs);
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

  const install = await db.projectPlugin.upsert({
    where: {
      pluginId_projectId: { pluginId: body.pluginId, projectId },
    },
    update: {
      enabled: body.enabled ?? true,
      config: body.config ?? {},
    },
    create: {
      pluginId: body.pluginId,
      projectId,
      enabled: body.enabled ?? true,
      config: body.config ?? {},
    },
    include: { plugin: true },
  });

  return NextResponse.json(install, { status: 201 });
}
