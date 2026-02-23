import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNextRun, describeSchedule } from "@/lib/scheduler/cron-parser";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const schedules = await db.schedule.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    schedules.map((s) => ({
      ...s,
      description: describeSchedule(s.cronExpression),
    }))
  );
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

  try {
    const nextRunAt = getNextRun(body.cronExpression);

    const schedule = await db.schedule.create({
      data: {
        name: body.name,
        cronExpression: body.cronExpression,
        enabled: body.enabled ?? true,
        timezone: body.timezone ?? "UTC",
        testIds: body.testIds ?? [],
        environmentId: body.environmentId,
        region: body.region,
        nextRunAt,
        projectId,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid schedule: ${(error as Error).message}` },
      { status: 400 }
    );
  }
}
