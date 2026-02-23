import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType");
  const targetId = searchParams.get("targetId");

  const where: Record<string, unknown> = { projectId };
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;

  const comments = await db.comment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
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

  if (!body.content || !body.targetType || !body.targetId) {
    return NextResponse.json(
      { error: "content, targetType, and targetId are required" },
      { status: 400 }
    );
  }

  const comment = await db.comment.create({
    data: {
      content: body.content,
      targetType: body.targetType,
      targetId: body.targetId,
      userId: session.user.id,
      projectId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await logActivity(
    session.user.id,
    projectId,
    "comment_added",
    body.targetType,
    body.targetId,
    { commentId: comment.id }
  );

  return NextResponse.json(comment, { status: 201 });
}
