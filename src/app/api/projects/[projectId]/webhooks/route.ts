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
  const webhooks = await db.webhook.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(webhooks);
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

  const webhook = await db.webhook.create({
    data: {
      name: body.name,
      url: body.url,
      events: body.events ?? ["run_failed"],
      headers: body.headers ?? {},
      enabled: body.enabled ?? true,
      secret: body.secret,
      projectId,
    },
  });

  return NextResponse.json(webhook, { status: 201 });
}
