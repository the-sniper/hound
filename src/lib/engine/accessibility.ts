import type { Page } from "playwright";
import { db } from "@/lib/db";

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  tags: string[];
  nodes: {
    target: string[];
    html: string;
  }[];
}

interface AxeResult {
  violations: AxeViolation[];
  passes: { id: string }[];
  incomplete: { id: string }[];
}

interface A11yAuditResult {
  score: number;
  violations: {
    ruleId: string;
    impact: string;
    wcagCriteria: string;
    description: string;
    target: string;
    html: string;
  }[];
  passCount: number;
  violationCount: number;
}

const AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";

export async function runAccessibilityAudit(
  page: Page,
  wcagLevel: string = "AA"
): Promise<A11yAuditResult> {
  const axeAlreadyLoaded = await page.evaluate(
    () => typeof (window as unknown as Record<string, unknown>).axe !== "undefined"
  );

  if (!axeAlreadyLoaded) {
    await page.addScriptTag({ url: AXE_CDN });
    await page.waitForFunction(
      () => typeof (window as unknown as Record<string, unknown>).axe !== "undefined",
      null,
      { timeout: 10000 }
    );
  }

  const tags = wcagLevel === "AAA"
    ? ["wcag2a", "wcag2aa", "wcag2aaa", "wcag21a", "wcag21aa", "wcag22aa"]
    : wcagLevel === "A"
      ? ["wcag2a", "wcag21a"]
      : ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

  const results = await page.evaluate(async (runTags: string[]) => {
    const axe = (window as unknown as Record<string, { run: (opts: unknown) => Promise<unknown> }>).axe;
    return axe.run({ runOnly: { type: "tag", values: runTags } });
  }, tags) as AxeResult;

  const violations = results.violations.flatMap((v) =>
    v.nodes.map((node) => ({
      ruleId: v.id,
      impact: v.impact || "minor",
      wcagCriteria: v.tags.filter((t) => t.startsWith("wcag")).join(", "),
      description: v.description,
      target: node.target.join(" > "),
      html: node.html.substring(0, 500),
    }))
  );

  const totalChecks = results.passes.length + results.violations.length + results.incomplete.length;
  const score = totalChecks > 0
    ? Math.round((results.passes.length / totalChecks) * 100)
    : 100;

  return {
    score,
    violations,
    passCount: results.passes.length,
    violationCount: violations.length,
  };
}

export async function saveAccessibilityResults(
  runId: string,
  stepId: string,
  audit: A11yAuditResult
): Promise<void> {
  if (audit.violations.length === 0) return;

  const stepResult = await db.stepResult.findFirst({
    where: { stepId, runId },
    select: { id: true },
  });

  if (!stepResult) return;

  await db.accessibilityResult.createMany({
    data: audit.violations.map((v) => ({
      ruleId: v.ruleId,
      impact: v.impact,
      wcagCriteria: v.wcagCriteria,
      description: v.description,
      target: v.target,
      html: v.html,
      stepResultId: stepResult.id,
      runId,
    })),
  });

  await db.testRun.update({
    where: { id: runId },
    data: { accessibilityScore: audit.score },
  });
}
