import type { Page } from "playwright";
import { db } from "@/lib/db";

interface WebVitals {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
}

interface NetworkTiming {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

export interface PerformanceBudget {
  lcp?: number;
  cls?: number;
  inp?: number;
  ttfb?: number;
}

export interface MetricResult {
  name: string;
  value: number;
  unit: string;
  budgetMax?: number;
  overBudget: boolean;
}

export async function captureWebVitals(page: Page): Promise<WebVitals> {
  return page.evaluate(() => {
    return new Promise<{
      lcp: number | null;
      cls: number | null;
      inp: number | null;
      fcp: number | null;
      ttfb: number | null;
    }>((resolve) => {
      const vitals: {
        lcp: number | null;
        cls: number | null;
        inp: number | null;
        fcp: number | null;
        ttfb: number | null;
      } = { lcp: null, cls: null, inp: null, fcp: null, ttfb: null };

      const perfEntries =
        performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (perfEntries.length > 0) {
        const nav = perfEntries[0];
        vitals.ttfb = nav.responseStart - nav.requestStart;
      }

      const paintEntries = performance.getEntriesByType("paint");
      for (const entry of paintEntries) {
        if (entry.name === "first-contentful-paint") {
          vitals.fcp = entry.startTime;
        }
      }

      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      if (lcpEntries.length > 0) {
        vitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }

      let clsValue = 0;
      const layoutShiftEntries = performance.getEntriesByType("layout-shift") as (PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      })[];
      for (const entry of layoutShiftEntries) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      vitals.cls = clsValue;

      resolve(vitals);
    });
  });
}

export async function captureNetworkTiming(page: Page): Promise<NetworkTiming> {
  return page.evaluate(() => {
    const entries =
      performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (entries.length === 0) {
      return { dns: 0, tcp: 0, tls: 0, ttfb: 0, download: 0, total: 0 };
    }
    const nav = entries[0];
    return {
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      tls:
        nav.secureConnectionStart > 0
          ? nav.connectEnd - nav.secureConnectionStart
          : 0,
      ttfb: nav.responseStart - nav.requestStart,
      download: nav.responseEnd - nav.responseStart,
      total: nav.loadEventEnd - nav.startTime,
    };
  });
}

export async function evaluatePerformanceMetrics(
  page: Page,
  budget?: PerformanceBudget
): Promise<MetricResult[]> {
  const vitals = await captureWebVitals(page);
  const network = await captureNetworkTiming(page);
  const metrics: MetricResult[] = [];

  if (vitals.lcp !== null) {
    metrics.push({
      name: "LCP",
      value: Math.round(vitals.lcp),
      unit: "ms",
      budgetMax: budget?.lcp,
      overBudget: budget?.lcp != null && vitals.lcp > budget.lcp,
    });
  }

  if (vitals.cls !== null) {
    metrics.push({
      name: "CLS",
      value: Math.round(vitals.cls * 1000) / 1000,
      unit: "score",
      budgetMax: budget?.cls,
      overBudget: budget?.cls != null && vitals.cls > budget.cls,
    });
  }

  if (vitals.fcp !== null) {
    metrics.push({
      name: "FCP",
      value: Math.round(vitals.fcp),
      unit: "ms",
      overBudget: false,
    });
  }

  if (vitals.ttfb !== null) {
    metrics.push({
      name: "TTFB",
      value: Math.round(vitals.ttfb),
      unit: "ms",
      budgetMax: budget?.ttfb,
      overBudget: budget?.ttfb != null && vitals.ttfb > budget.ttfb,
    });
  }

  if (vitals.inp !== null) {
    metrics.push({
      name: "INP",
      value: Math.round(vitals.inp),
      unit: "ms",
      budgetMax: budget?.inp,
      overBudget: budget?.inp != null && vitals.inp > budget.inp,
    });
  }

  metrics.push(
    { name: "DNS", value: Math.round(network.dns), unit: "ms", overBudget: false },
    { name: "TCP", value: Math.round(network.tcp), unit: "ms", overBudget: false },
    { name: "TLS", value: Math.round(network.tls), unit: "ms", overBudget: false },
    { name: "Download", value: Math.round(network.download), unit: "ms", overBudget: false },
    { name: "PageLoad", value: Math.round(network.total), unit: "ms", overBudget: false }
  );

  return metrics;
}

export async function savePerformanceMetrics(
  runId: string,
  stepResultId: string,
  metrics: MetricResult[]
): Promise<void> {
  if (metrics.length === 0) return;

  await db.performanceMetric.createMany({
    data: metrics.map((m) => ({
      name: m.name,
      value: m.value,
      unit: m.unit,
      budgetMax: m.budgetMax ?? null,
      overBudget: m.overBudget,
      stepResultId,
      runId,
    })),
  });
}
