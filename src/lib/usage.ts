import { db } from "@/lib/db";

export interface UsageSummary {
  runsThisMonth: number;
  runsLimit: number | null;
  testsCount: number;
  projectsCount: number;
  tier: "free" | "pro" | "enterprise";
  overLimit: boolean;
}

export interface TierLimits {
  runs: number | null;
  projects: number;
  tests: number;
  parallelism: number;
  monitoring: boolean;
  teamMembers: number;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    runs: 100,
    projects: 3,
    tests: 50,
    parallelism: 1,
    monitoring: false,
    teamMembers: 1,
  },
  pro: {
    runs: null,
    projects: 20,
    tests: 500,
    parallelism: 10,
    monitoring: true,
    teamMembers: 10,
  },
  enterprise: {
    runs: null,
    projects: -1,
    tests: -1,
    parallelism: 50,
    monitoring: true,
    teamMembers: -1,
  },
};

export async function getUserUsage(userId: string): Promise<UsageSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [runsThisMonth, testsCount, projectsCount] = await Promise.all([
    db.testRun.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    }),
    db.test.count({
      where: {
        project: {
          members: { some: { userId } },
        },
      },
    }),
    db.projectMember.count({
      where: { userId },
    }),
  ]);

  const tier = "free" as const;
  const limits = TIER_LIMITS[tier];

  return {
    runsThisMonth,
    runsLimit: limits.runs,
    testsCount,
    projectsCount,
    tier,
    overLimit: limits.runs !== null && runsThisMonth >= limits.runs,
  };
}

export async function checkRunQuota(userId: string): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return !usage.overLimit;
}
