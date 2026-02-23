import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNextRun } from "@/lib/scheduler/cron-parser";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; scheduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scheduleId } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.enabled !== undefined) data.enabled = body.enabled;
  if (body.testIds !== undefined) data.testIds = body.testIds;
  if (body.environmentId !== undefined) data.environmentId = body.environmentId;
  if (body.region !== undefined) data.region = body.region;
  if (body.cronExpression !== undefined) {
    data.cronExpression = body.cronExpression;
    data.nextRunAt = getNextRun(body.cronExpression);
  }

  const schedule = await db.schedule.update({
    where: { id: scheduleId },
    data,
  });

  return NextResponse.json(schedule);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; scheduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scheduleId } = await params;

  await db.schedule.delete({ where: { id: scheduleId } });
  return NextResponse.json({ success: true });
}
