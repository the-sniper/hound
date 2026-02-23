import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; installId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { installId } = await params;
  const body = await request.json();

  const install = await db.projectPlugin.update({
    where: { id: installId },
    data: {
      enabled: body.enabled,
      config: body.config,
    },
    include: { plugin: true },
  });

  return NextResponse.json(install);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; installId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { installId } = await params;
  await db.projectPlugin.delete({ where: { id: installId } });
  return NextResponse.json({ success: true });
}
