import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { webhookId } = await params;
  const body = await request.json();

  const webhook = await db.webhook.update({
    where: { id: webhookId },
    data: {
      name: body.name,
      url: body.url,
      events: body.events,
      headers: body.headers,
      enabled: body.enabled,
      secret: body.secret,
    },
  });

  return NextResponse.json(webhook);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { webhookId } = await params;
  await db.webhook.delete({ where: { id: webhookId } });
  return NextResponse.json({ success: true });
}
