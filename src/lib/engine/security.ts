import type { Page } from "playwright";
import { db } from "@/lib/db";

interface SecurityCheck {
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  evidence?: string;
  remediation?: string;
  location?: string;
}

export async function runSecurityScan(
  page: Page,
  scanTypes?: string[]
): Promise<SecurityCheck[]> {
  const findings: SecurityCheck[] = [];
  const checks = scanTypes?.length
    ? scanTypes
    : ["headers", "cookies", "mixed_content", "csrf", "open_redirect"];

  if (checks.includes("headers")) {
    findings.push(...(await checkSecurityHeaders(page)));
  }
  if (checks.includes("cookies")) {
    findings.push(...(await checkCookieSecurity(page)));
  }
  if (checks.includes("mixed_content")) {
    findings.push(...(await checkMixedContent(page)));
  }
  if (checks.includes("csrf")) {
    findings.push(...(await checkCsrf(page)));
  }
  if (checks.includes("xss")) {
    findings.push(...(await checkXssVectors(page)));
  }

  return findings;
}

async function checkSecurityHeaders(page: Page): Promise<SecurityCheck[]> {
  const findings: SecurityCheck[] = [];
  const url = page.url();

  const response = await page.evaluate(async (targetUrl: string) => {
    try {
      const res = await fetch(targetUrl, {
        method: "HEAD",
        credentials: "same-origin",
      });
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      return headers;
    } catch {
      return {};
    }
  }, url);

  const required: {
    header: string;
    severity: "high" | "medium" | "low";
    title: string;
    remediation: string;
  }[] = [
    {
      header: "content-security-policy",
      severity: "high",
      title: "Missing Content-Security-Policy header",
      remediation:
        "Add a Content-Security-Policy header to prevent XSS and data injection attacks",
    },
    {
      header: "strict-transport-security",
      severity: "high",
      title: "Missing Strict-Transport-Security header",
      remediation:
        "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' header",
    },
    {
      header: "x-content-type-options",
      severity: "medium",
      title: "Missing X-Content-Type-Options header",
      remediation: "Add 'X-Content-Type-Options: nosniff' header",
    },
    {
      header: "x-frame-options",
      severity: "medium",
      title: "Missing X-Frame-Options header",
      remediation: "Add 'X-Frame-Options: DENY' or 'SAMEORIGIN' header",
    },
    {
      header: "referrer-policy",
      severity: "low",
      title: "Missing Referrer-Policy header",
      remediation:
        "Add 'Referrer-Policy: strict-origin-when-cross-origin' header",
    },
  ];

  for (const check of required) {
    if (!response[check.header]) {
      findings.push({
        type: "missing_header",
        severity: check.severity,
        title: check.title,
        description: `The ${check.header} header is not set on ${url}`,
        remediation: check.remediation,
        location: url,
      });
    }
  }

  return findings;
}

async function checkCookieSecurity(page: Page): Promise<SecurityCheck[]> {
  const findings: SecurityCheck[] = [];
  const cookies = await page.context().cookies();

  for (const cookie of cookies) {
    if (!cookie.secure && page.url().startsWith("https")) {
      findings.push({
        type: "insecure_cookie",
        severity: "high",
        title: `Cookie "${cookie.name}" missing Secure flag`,
        description: `Cookie transmitted over HTTPS but missing Secure flag`,
        evidence: `Cookie: ${cookie.name}=${cookie.value.substring(0, 20)}...`,
        remediation: "Set the Secure flag on all cookies served over HTTPS",
        location: cookie.domain,
      });
    }
    if (
      !cookie.httpOnly &&
      (cookie.name.toLowerCase().includes("session") ||
        cookie.name.toLowerCase().includes("token") ||
        cookie.name.toLowerCase().includes("auth"))
    ) {
      findings.push({
        type: "missing_httponly",
        severity: "high",
        title: `Sensitive cookie "${cookie.name}" missing HttpOnly flag`,
        description: `Session/auth cookie accessible to JavaScript`,
        remediation:
          "Set HttpOnly flag on session and authentication cookies",
        location: cookie.domain,
      });
    }
    if (cookie.sameSite === "None" || !cookie.sameSite) {
      findings.push({
        type: "weak_samesite",
        severity: "medium",
        title: `Cookie "${cookie.name}" has weak SameSite policy`,
        description: `Cookie vulnerable to cross-site request attacks`,
        remediation: "Set SameSite=Strict or SameSite=Lax",
        location: cookie.domain,
      });
    }
  }

  return findings;
}

async function checkMixedContent(page: Page): Promise<SecurityCheck[]> {
  const findings: SecurityCheck[] = [];
  if (!page.url().startsWith("https")) return findings;

  const httpResources = await page.evaluate(() => {
    const resources: string[] = [];
    document
      .querySelectorAll("img[src], script[src], link[href], iframe[src]")
      .forEach((el) => {
        const src = el.getAttribute("src") || el.getAttribute("href") || "";
        if (src.startsWith("http://")) {
          resources.push(`${el.tagName}: ${src}`);
        }
      });
    return resources;
  });

  for (const resource of httpResources) {
    findings.push({
      type: "mixed_content",
      severity: "medium",
      title: "Mixed content detected",
      description: `HTTP resource loaded on HTTPS page`,
      evidence: resource,
      remediation: "Update all resource URLs to use HTTPS",
      location: page.url(),
    });
  }

  return findings;
}

async function checkCsrf(page: Page): Promise<SecurityCheck[]> {
  const findings: SecurityCheck[] = [];

  const forms = await page.evaluate(() => {
    const results: { action: string; method: string; hasCsrf: boolean }[] = [];
    document.querySelectorAll("form").forEach((form) => {
      const method = (form.getAttribute("method") || "GET").toUpperCase();
      if (method === "POST" || method === "PUT" || method === "DELETE") {
        const hasCsrf = !!form.querySelector(
          'input[name*="csrf"], input[name*="token"], input[name*="_token"], input[name="authenticity_token"]'
        );
        results.push({
          action: form.getAttribute("action") || "",
          method,
          hasCsrf,
        });
      }
    });
    return results;
  });

  for (const form of forms) {
    if (!form.hasCsrf) {
      findings.push({
        type: "missing_csrf",
        severity: "high",
        title: `${form.method} form missing CSRF token`,
        description: `Form submitting to "${form.action || "current page"}" has no CSRF protection`,
        remediation: "Add a CSRF token to all state-changing forms",
        location: form.action || page.url(),
      });
    }
  }

  return findings;
}

async function checkXssVectors(page: Page): Promise<SecurityCheck[]> {
  const findings: SecurityCheck[] = [];

  const unsafePatterns = await page.evaluate(() => {
    const issues: { type: string; detail: string }[] = [];

    document
      .querySelectorAll("[onclick], [onerror], [onload], [onmouseover]")
      .forEach((el) => {
        issues.push({
          type: "inline_handler",
          detail: `${el.tagName} has inline event handler`,
        });
      });

    document.querySelectorAll("script:not([src])").forEach((el) => {
      const content = el.textContent || "";
      if (
        content.includes("innerHTML") ||
        content.includes("document.write") ||
        content.includes("eval(")
      ) {
        issues.push({
          type: "unsafe_dom",
          detail: `Inline script uses unsafe DOM manipulation`,
        });
      }
    });

    return issues;
  });

  for (const pattern of unsafePatterns) {
    findings.push({
      type: "xss_vector",
      severity: pattern.type === "unsafe_dom" ? "high" : "medium",
      title:
        pattern.type === "inline_handler"
          ? "Inline event handler detected"
          : "Unsafe DOM manipulation detected",
      description: pattern.detail,
      remediation:
        pattern.type === "inline_handler"
          ? "Use addEventListener instead of inline event handlers"
          : "Use textContent or sanitized innerHTML instead of raw DOM manipulation",
      location: page.url(),
    });
  }

  return findings;
}

export function calculateSecurityGrade(findings: SecurityCheck[]): string {
  if (findings.length === 0) return "A";
  const criticalCount = findings.filter(
    (f) => f.severity === "critical"
  ).length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;

  if (criticalCount > 0) return "F";
  if (highCount >= 3) return "D";
  if (highCount >= 1) return "C";
  if (mediumCount >= 3) return "C";
  if (mediumCount >= 1) return "B";
  return "A";
}

export async function saveSecurityFindings(
  runId: string,
  projectId: string,
  findings: SecurityCheck[]
): Promise<void> {
  if (findings.length === 0) return;

  await db.securityFinding.createMany({
    data: findings.map((f) => ({
      type: f.type,
      severity: f.severity,
      title: f.title,
      description: f.description,
      evidence: f.evidence,
      remediation: f.remediation,
      location: f.location,
      runId,
      projectId,
    })),
  });

  const grade = calculateSecurityGrade(findings);
  await db.testRun.update({
    where: { id: runId },
    data: { securityGrade: grade },
  });
}
