import { db } from "@/lib/db";
import { getNextRun } from "./cron-parser";

export async function checkAndRunSchedules(): Promise<number> {
  const now = new Date();

  const dueSchedules = await db.schedule.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
    },
    include: {
      project: { select: { baseUrl: true } },
    },
  });

  let triggered = 0;

  for (const schedule of dueSchedules) {
    try {
      const testIds = (schedule.testIds as string[]) || [];
      if (testIds.length === 0) continue;

      for (const testId of testIds) {
        await db.testRun.create({
          data: {
            testId,
            projectId: schedule.projectId,
            baseUrl: schedule.project.baseUrl,
            environmentId: schedule.environmentId,
          },
        });
      }

      const nextRun = getNextRun(schedule.cronExpression, now);
      await db.schedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt: nextRun,
        },
      });

      triggered++;
    } catch (error) {
      console.error(`Schedule ${schedule.id} failed:`, error);
    }
  }

  return triggered;
}

export async function initializeScheduleNextRuns(): Promise<void> {
  const schedules = await db.schedule.findMany({
    where: { enabled: true, nextRunAt: null },
  });

  for (const schedule of schedules) {
    try {
      const nextRun = getNextRun(schedule.cronExpression);
      await db.schedule.update({
        where: { id: schedule.id },
        data: { nextRunAt: nextRun },
      });
    } catch (error) {
      console.error(`Failed to init schedule ${schedule.id}:`, error);
    }
  }
}
