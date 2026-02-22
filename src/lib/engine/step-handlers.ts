import type { Page, BrowserContext } from "playwright";
import type { StepConfig } from "@/types/test";
import { findElement } from "@/lib/ai/locator-agent";
import { checkAssertion } from "@/lib/ai/assertion-agent";
import { db } from "@/lib/db";
import type { AIAgentContext } from "@/types/ai";

async function getAIContext(page: Page, anthropicKey?: string | null, openaiKey?: string | null): Promise<AIAgentContext> {
  // Get accessibility snapshot with type assertion for Playwright
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessibilityTree = await (page as any).accessibility?.snapshot?.() ?? {};
  
  // Also get simplified HTML structure for form elements
  const formElements = await page.evaluate(() => {
    // ... same as before
    const elements: any[] = [];
    const inputs = document.querySelectorAll('input, button, textarea, select, [type="submit"], [role="button"], [role="textbox"], [role="input"]');
    inputs.forEach((el) => {
      const isButton = el.tagName.toLowerCase() === 'button' || el.getAttribute('type') === 'submit' || el.getAttribute('role') === 'button';
      let text = '';
      if (isButton) {
        text = (el as any).innerText?.trim() || el.getAttribute('value') || el.textContent?.trim() || '';
      }
      elements.push({
        tag: el.tagName.toLowerCase(),
        type: (el as any).type,
        name: (el as any).name,
        id: el.id,
        placeholder: (el as any).placeholder,
        ariaLabel: el.getAttribute('aria-label') || undefined,
        classes: el.className,
        text: text || undefined,
      });
    });
    return elements.slice(0, 50);
  });
  
  return {
    pageUrl: page.url(),
    pageTitle: await page.title(),
    accessibilityTree: JSON.stringify(accessibilityTree, null, 2),
    formElements,
    anthropicKey,
    openaiKey,
  };
}

interface StepContext {
  stepCache?: Map<string, string>;
  anthropicKey?: string | null;
  openaiKey?: string | null;
  projectId?: string;
  branch?: string | null;
  stepId?: string;
  runId?: string;
  onCacheHit?: (target: string) => void;
  onCacheMiss?: (target: string) => void;
}

async function resolveSelector(
  page: Page,
  target: string,
  stepType: string,
  ctx?: StepContext
): Promise<string> {
  if (ctx?.stepCache?.has(target)) {
    ctx?.onCacheHit?.(target);
    return ctx.stepCache.get(target)!;
  }

  if (ctx?.projectId) {
    const { getCachedSelector, generateCacheKey } = await import(
      "./step-cache"
    );
    const cacheKey = generateCacheKey(stepType, target);
    const cached = await getCachedSelector(ctx.projectId, cacheKey, ctx.branch);
    if (cached) {
      ctx?.stepCache?.set(target, cached.selector);
      ctx?.onCacheHit?.(target);
      return cached.selector;
    }
  }

  const aiContext = await getAIContext(page, ctx?.anthropicKey, ctx?.openaiKey);
  const result = await findElement(target, aiContext);

  ctx?.stepCache?.set(target, result.selector);
  if (ctx?.projectId && ctx?.stepId) {
    const { setCachedSelector, generateCacheKey } = await import(
      "./step-cache"
    );
    const cacheKey = generateCacheKey(stepType, target);
    try {
      await setCachedSelector(
        ctx.projectId,
        ctx.stepId,
        cacheKey,
        result.selector,
        ctx.branch
      );
    } catch {
      // Cache write is best-effort
    }
  }
  ctx?.onCacheMiss?.(target);

  return result.selector;
}

export type StepHandler = (
  page: Page,
  config: StepConfig,
  context?: StepContext
) => Promise<{ logs?: string[]; aiResponse?: unknown }>;

export const stepHandlers: Record<string, StepHandler> = {
  NAVIGATE: async (page, config) => {
    if (!config.url) throw new Error("URL is required for navigate step");
    await page.goto(config.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    return {};
  },

  CLICK: async (page, config, ctx) => {
    if (!config.target) throw new Error("Target is required for click step");

    const selector = await resolveSelector(page, config.target, "CLICK", ctx);

    try {
      await page.locator(selector).click({ timeout: 5000 });
      return {};
    } catch (error) {
      console.log(`AI selector "${selector}" failed, trying fallbacks...`);
      
      // Fallback: try common button patterns
      const fallbackSelectors = [
        // Try common submit button patterns
        'button[type="submit"]',
        'input[type="submit"]',
        // Try role-based
        'role=button[name="Sign In"]',
        'role=button[name="Login"]',
        'role=button[name="Continue"]',
        // Try text-based fallbacks - match common button texts
        'text=/Sign In/i',
        'text=/Login/i',
        'text=/Continue/i',
        'text=/Next/i',
        'text=/Submit/i',
      ];

      const triedSelectors: string[] = [selector];
      
      for (const fallback of fallbackSelectors) {
        triedSelectors.push(fallback);
        try {
          const count = await page.locator(fallback).count();
          if (count > 0) {
            await page.locator(fallback).first().click({ timeout: 3000 });
            console.log(`Used fallback selector: ${fallback}`);
            return { logs: [`AI selector "${selector}" failed, used fallback: ${fallback}`] };
          }
        } catch (e) {
          console.log(`Fallback "${fallback}" also failed: ${e}`);
          continue;
        }
      }

      throw new Error(
        `Could not find clickable element for "${config.target}". ` +
        `Tried selectors: ${triedSelectors.join(', ')}. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  TYPE: async (page, config, ctx) => {
    if (!config.target) throw new Error("Target is required for type step");
    if (config.value === undefined)
      throw new Error("Value is required for type step");

    const selector = await resolveSelector(page, config.target, "TYPE", ctx);

    await page.locator(selector).fill(config.value, { timeout: 10000 });
    return {};
  },

  WAIT: async (page, config) => {
    const duration = config.duration ?? 1000;
    await page.waitForTimeout(duration);
    return {};
  },

  WAIT_FOR_URL: async (page, config) => {
    if (!config.urlPattern) throw new Error("URL pattern is required");
    await page.waitForURL(config.urlPattern, { timeout: 30000 });
    return {};
  },

  ASSERT_TEXT: async (page, config) => {
    if (!config.expectedText) throw new Error("Expected text is required");
    const content = (await page.textContent("body")) ?? "";
    if (!content.includes(config.expectedText)) {
      throw new Error(
        `Expected text "${config.expectedText}" not found on page`
      );
    }
    return {};
  },

  ASSERT_ELEMENT: async (page, config, ctx) => {
    if (!config.target) throw new Error("Target is required");

    const selector = await resolveSelector(
      page,
      config.target,
      "ASSERT_ELEMENT",
      ctx
    );

    const element = page.locator(selector);
    const count = await element.count();
    if (count === 0) {
      throw new Error(`Element "${config.target}" not found`);
    }
    return {};
  },

  AI_CHECK: async (page, config, ctx) => {
    if (!config.assertion)
      throw new Error("Assertion is required for AI check");
    const context = await getAIContext(page, ctx?.anthropicKey, ctx?.openaiKey);
    const result = await checkAssertion(config.assertion, context);
    if (!result.passed) {
      throw new Error(`AI assertion failed: ${result.explanation}`);
    }
    return { aiResponse: result };
  },

  AI_EXTRACT: async (page, config, ctx) => {
    if (!config.query) throw new Error("Query is required for AI extract");
    const context = await getAIContext(page, ctx?.anthropicKey, ctx?.openaiKey);
    const result = await checkAssertion(`Extract: ${config.query}`, context);
    return { aiResponse: result };
  },

  AI_ACTION: async (page, config, ctx) => {
    if (!config.target) throw new Error("Action description is required");
    const selector = await resolveSelector(
      page,
      config.target,
      "AI_ACTION",
      ctx
    );
    await page.locator(selector).click({ timeout: 10000 });
    return { aiResponse: { selector } };
  },

  JAVASCRIPT: async (page, config) => {
    if (!config.code) throw new Error("Code is required for JavaScript step");
    const result = await page.evaluate(config.code);
    return { logs: [String(result)] };
  },

  SCREENSHOT: async () => {
    return {};
  },

  HOVER: async (page, config, ctx) => {
    if (!config.target) throw new Error("Target is required for hover step");

    const selector = await resolveSelector(page, config.target, "HOVER", ctx);

    await page.locator(selector).hover({ timeout: 10000 });
    return {};
  },

  SELECT: async (page, config, ctx) => {
    if (!config.target) throw new Error("Target is required for select step");
    if (!config.optionValue) throw new Error("Option value is required");

    const selector = await resolveSelector(
      page,
      config.target,
      "SELECT",
      ctx
    );

    await page.locator(selector).selectOption(config.optionValue, {
      timeout: 10000,
    });
    return {};
  },

  PRESS_KEY: async (page, config) => {
    if (!config.key) throw new Error("Key is required for press key step");
    await page.keyboard.press(config.key);
    return {};
  },

  SCROLL: async (page, config) => {
    const direction = config.direction ?? "down";
    const amount = config.amount ?? 300;
    const deltaX =
      direction === "left" ? -amount : direction === "right" ? amount : 0;
    const deltaY =
      direction === "up" ? -amount : direction === "down" ? amount : 0;
    await page.mouse.wheel(deltaX, deltaY);
    return {};
  },

  SAVE_AUTH: async (page, config, ctx) => {
    const name = config.authStateName;
    if (!name) throw new Error("Auth state name is required");
    if (!ctx?.projectId) throw new Error("Project ID is required for auth state");

    const context = page.context() as BrowserContext;
    const storageState = await context.storageState();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.authState.upsert({
      where: { projectId_name: { projectId: ctx.projectId, name } },
      update: { stateData: JSON.parse(JSON.stringify(storageState)), expiresAt },
      create: { name, stateData: JSON.parse(JSON.stringify(storageState)), projectId: ctx.projectId, expiresAt },
    });

    return { logs: [`Auth state "${name}" saved`] };
  },

  LOAD_AUTH: async (page, config, ctx) => {
    const name = config.authStateName;
    if (!name) throw new Error("Auth state name is required");
    if (!ctx?.projectId) throw new Error("Project ID is required for auth state");

    const authState = await db.authState.findFirst({
      where: { projectId: ctx.projectId, name, expiresAt: { gt: new Date() } },
    });

    if (!authState) throw new Error(`Auth state "${name}" not found or expired`);

    const stateData = authState.stateData as Record<string, unknown>;
    const cookies = stateData.cookies as Array<Record<string, unknown>> | undefined;
    if (cookies?.length) {
      const context = page.context() as BrowserContext;
      await context.addCookies(cookies as unknown as Parameters<BrowserContext["addCookies"]>[0]);
    }

    const origins = stateData.origins as Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }> | undefined;
    if (origins?.length) {
      for (const origin of origins) {
        if (origin.localStorage?.length) {
          await page.evaluate((items) => {
            for (const item of items) {
              localStorage.setItem(item.name, item.value);
            }
          }, origin.localStorage);
        }
      }
    }

    return { logs: [`Auth state "${name}" loaded`] };
  },

  MOCK_ROUTE: async (page, config) => {
    const pattern = config.mockUrlPattern;
    if (!pattern) throw new Error("URL pattern is required for mock route");

    const statusCode = config.mockStatusCode ?? 200;
    const body = config.mockResponseBody ?? "";
    const headers = config.mockHeaders ?? {};

    await page.route(pattern, (route) => {
      if (config.mockMethod && route.request().method() !== config.mockMethod.toUpperCase()) {
        return route.fallback();
      }
      return route.fulfill({
        status: statusCode,
        contentType: headers["content-type"] || "application/json",
        headers,
        body,
      });
    });

    return { logs: [`Route mocked: ${pattern} → ${statusCode}`] };
  },

  REMOVE_MOCK: async (page, config) => {
    const pattern = config.mockUrlPattern;
    if (!pattern) throw new Error("URL pattern is required to remove mock");

    await page.unroute(pattern);
    return { logs: [`Mock removed: ${pattern}`] };
  },

  CONDITIONAL: async (page, config) => {
    const conditionType = config.conditionType;
    const conditionValue = config.conditionValue ?? "";
    let conditionMet = false;

    switch (conditionType) {
      case "element_exists": {
        const target = config.condition ?? "";
        const count = await page.locator(target).count();
        conditionMet = count > 0;
        break;
      }
      case "text_contains": {
        const bodyText = (await page.textContent("body")) ?? "";
        conditionMet = bodyText.includes(conditionValue);
        break;
      }
      case "url_matches": {
        const currentUrl = page.url();
        conditionMet = new RegExp(conditionValue).test(currentUrl);
        break;
      }
      case "variable_equals": {
        const varName = config.condition ?? "";
        const envValue = process.env[varName] ?? "";
        conditionMet = envValue === conditionValue;
        break;
      }
      default:
        throw new Error(`Unknown condition type: ${conditionType}`);
    }

    return {
      logs: [`Condition "${conditionType}" evaluated to ${conditionMet}`],
      aiResponse: { conditionMet, thenSteps: config.thenSteps, elseSteps: config.elseSteps },
    };
  },

  SKIP_IF: async (page, config) => {
    const conditionType = config.skipConditionType;
    const conditionValue = config.skipConditionValue ?? "";
    let shouldSkip = false;

    switch (conditionType) {
      case "element_exists": {
        const target = config.skipCondition ?? "";
        const count = await page.locator(target).count();
        shouldSkip = count > 0;
        break;
      }
      case "text_contains": {
        const bodyText = (await page.textContent("body")) ?? "";
        shouldSkip = bodyText.includes(conditionValue);
        break;
      }
      case "url_matches": {
        const currentUrl = page.url();
        shouldSkip = new RegExp(conditionValue).test(currentUrl);
        break;
      }
      case "variable_equals": {
        const varName = config.skipCondition ?? "";
        const envValue = process.env[varName] ?? "";
        shouldSkip = envValue === conditionValue;
        break;
      }
      default:
        throw new Error(`Unknown condition type: ${conditionType}`);
    }

    if (shouldSkip) {
      return {
        logs: [`Step skipped: condition "${conditionType}" was true`],
        aiResponse: { skipped: true },
      };
    }

    return { logs: [`Step not skipped: condition "${conditionType}" was false`] };
  },

  ASSERT_ACCESSIBLE: async (page, config, ctx) => {
    const { runAccessibilityAudit, saveAccessibilityResults } = await import("./accessibility");

    const wcagLevel = config.wcagLevel ?? "AA";
    const failOnA11y = config.failOnA11y !== false;
    const impactThreshold = config.a11yImpactThreshold ?? "serious";

    const audit = await runAccessibilityAudit(page, wcagLevel);

    if (ctx?.runId && ctx?.stepId) {
      await saveAccessibilityResults(ctx.runId, ctx.stepId, audit);
    }

    const impactLevels = ["minor", "moderate", "serious", "critical"];
    const thresholdIndex = impactLevels.indexOf(impactThreshold);
    const criticalViolations = audit.violations.filter(
      (v) => impactLevels.indexOf(v.impact) >= thresholdIndex
    );

    if (failOnA11y && criticalViolations.length > 0) {
      throw new Error(
        `Accessibility: ${criticalViolations.length} ${impactThreshold}+ violations found. ` +
        `Score: ${audit.score}/100. Top: ${criticalViolations.slice(0, 3).map((v) => v.ruleId).join(", ")}`
      );
    }

    return {
      logs: [`A11y audit: score ${audit.score}/100, ${audit.violationCount} violations, ${audit.passCount} passes`],
    };
  },

  SECURITY_SCAN: async (page, config, ctx) => {
    const { runSecurityScan, saveSecurityFindings, calculateSecurityGrade } =
      await import("./security");

    const scanTypes = config.scanTypes as string[] | undefined;
    const findings = await runSecurityScan(page, scanTypes);

    if (ctx?.runId && ctx?.projectId) {
      await saveSecurityFindings(ctx.runId, ctx.projectId, findings);
    }

    const grade = calculateSecurityGrade(findings);

    if (findings.some((f) => f.severity === "critical")) {
      throw new Error(
        `Security scan: Grade ${grade}. ${findings.length} findings including critical issues.`
      );
    }

    return {
      logs: [`Security scan: Grade ${grade}, ${findings.length} findings`],
    };
  },
};
