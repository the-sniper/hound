import { db } from "@/lib/db";
import crypto from "crypto";

const DEFAULT_TTL_DAYS = 90;

export function generateCacheKey(stepType: string, target: string): string {
  return crypto
    .createHash("sha256")
    .update(`${stepType}:${target}`)
    .digest("hex")
    .slice(0, 32);
}

export async function getCachedSelector(
  projectId: string,
  cacheKey: string,
  branch?: string | null
): Promise<{ selector: string; attributes: Record<string, unknown> } | null> {
  const entry = await db.stepCache.findFirst({
    where: {
      projectId,
      cacheKey,
      branch: branch ?? null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (entry)
    return {
      selector: entry.selector,
      attributes: entry.attributes as Record<string, unknown>,
    };

  if (branch) {
    const mainEntry = await db.stepCache.findFirst({
      where: {
        projectId,
        cacheKey,
        branch: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (mainEntry)
      return {
        selector: mainEntry.selector,
        attributes: mainEntry.attributes as Record<string, unknown>,
      };
  }

  return null;
}

export async function setCachedSelector(
  projectId: string,
  stepId: string,
  cacheKey: string,
  selector: string,
  branch?: string | null,
  attributes?: Record<string, unknown>
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_TTL_DAYS);

  const existing = await db.stepCache.findFirst({
    where: { projectId, cacheKey, branch: branch ?? null },
  });

  if (existing) {
    await db.stepCache.update({
      where: { id: existing.id },
      data: {
        selector,
        attributes: (attributes ?? {}) as Record<string, never>,
        expiresAt,
        stepId,
      },
    });
  } else {
    await db.stepCache.create({
      data: {
        cacheKey,
        selector,
        branch: branch ?? null,
        attributes: (attributes ?? {}) as Record<string, never>,
        stepId,
        projectId,
        expiresAt,
      },
    });
  }
}

export async function warmFromBranch(
  projectId: string,
  sourceBranch: string | null,
  targetBranch: string
): Promise<number> {
  const sourceEntries = await db.stepCache.findMany({
    where: {
      projectId,
      branch: sourceBranch,
      expiresAt: { gt: new Date() },
    },
  });

  let warmed = 0;
  for (const entry of sourceEntries) {
    const exists = await db.stepCache.findFirst({
      where: { projectId, cacheKey: entry.cacheKey, branch: targetBranch },
    });
    if (!exists) {
      await db.stepCache.create({
        data: {
          cacheKey: entry.cacheKey,
          selector: entry.selector,
          branch: targetBranch,
          attributes: (entry.attributes ?? {}) as Record<string, never>,
          stepId: entry.stepId,
          projectId,
          expiresAt: entry.expiresAt,
        },
      });
      warmed++;
    }
  }
  return warmed;
}

export async function cleanupExpiredCache(): Promise<number> {
  const result = await db.stepCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export async function getCacheStats(projectId: string): Promise<{
  totalEntries: number;
  expiredEntries: number;
  branches: string[];
}> {
  const now = new Date();
  const [total, expired, branchEntries] = await Promise.all([
    db.stepCache.count({ where: { projectId } }),
    db.stepCache.count({ where: { projectId, expiresAt: { lt: now } } }),
    db.stepCache.findMany({
      where: { projectId },
      select: { branch: true },
      distinct: ["branch"],
    }),
  ]);

  return {
    totalEntries: total,
    expiredEntries: expired,
    branches: branchEntries
      .map((e) => e.branch)
      .filter(Boolean) as string[],
  };
}
