import { db } from "@/lib/db";

export async function logActivity(
  userId: string,
  projectId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.activityLog.create({
    data: {
      action,
      entityType,
      entityId,
      metadata: (metadata ?? {}) as Record<string, never>,
      userId,
      projectId,
    },
  });
}
