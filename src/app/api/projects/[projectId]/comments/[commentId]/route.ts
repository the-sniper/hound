import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;
  const body = await request.json();

  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Not found or not authorized" },
      { status: 404 }
    );
  }

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { content: body.content },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;

  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Not found or not authorized" },
      { status: 404 }
    );
  }

  await db.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
