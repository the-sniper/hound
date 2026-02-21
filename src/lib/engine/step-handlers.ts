import type { Page } from "playwright";
import type { StepConfig } from "@/types/test";
import { findElement } from "@/lib/ai/locator-agent";
import { checkAssertion } from "@/lib/ai/assertion-agent";
import type { AIAgentContext } from "@/types/ai";

async function getAIContext(page: Page): Promise<AIAgentContext> {
  const accessibilityTree = (await page.accessibility.snapshot()) ?? {};
  return {
    pageUrl: page.url(),
    pageTitle: await page.title(),
    accessibilityTree: JSON.stringify(accessibilityTree, null, 2),
  };
}

async function resolveSelector(page: Page, target: string): Promise<string> {
  const context = await getAIContext(page);
  const result = await findElement(target, context);
  return result.selector;
}

export type StepHandler = (
  page: Page,
  config: StepConfig,
  context?: { stepCache?: Map<string, string> }
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

    let selector = ctx?.stepCache?.get(config.target);
    if (!selector) {
      selector = await resolveSelector(page, config.target);
      ctx?.stepCache?.set(config.target, selector);
    }

    await page.locator(selector).click({ timeout: 10000 });
    return {};
  },

  TYPE: async (page, config, ctx) => {
    if (!config.target) throw new Error("Target is required for type step");
    if (config.value === undefined)
      throw new Error("Value is required for type step");

    let selector = ctx?.stepCache?.get(config.target);
    if (!selector) {
      selector = await resolveSelector(page, config.target);
      ctx?.stepCache?.set(config.target, selector);
    }

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

    let selector = ctx?.stepCache?.get(config.target);
    if (!selector) {
      selector = await resolveSelector(page, config.target);
      ctx?.stepCache?.set(config.target, selector);
    }

    const element = page.locator(selector);
    const count = await element.count();
    if (count === 0) {
      throw new Error(`Element "${config.target}" not found`);
    }
    return {};
  },

  AI_CHECK: async (page, config) => {
    if (!config.assertion)
      throw new Error("Assertion is required for AI check");
    const context = await getAIContext(page);
    const result = await checkAssertion(config.assertion, context);
    if (!result.passed) {
      throw new Error(`AI assertion failed: ${result.explanation}`);
    }
    return { aiResponse: result };
  },

  AI_EXTRACT: async (page, config) => {
    if (!config.query) throw new Error("Query is required for AI extract");
    const context = await getAIContext(page);
    const result = await checkAssertion(`Extract: ${config.query}`, context);
    return { aiResponse: result };
  },

  AI_ACTION: async (page, config, ctx) => {
    if (!config.target) throw new Error("Action description is required");
    const context = await getAIContext(page);
    const locResult = await findElement(config.target, context);

    ctx?.stepCache?.set(config.target, locResult.selector);
    await page.locator(locResult.selector).click({ timeout: 10000 });
    return { aiResponse: locResult };
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

    let selector = ctx?.stepCache?.get(config.target);
    if (!selector) {
      selector = await resolveSelector(page, config.target);
      ctx?.stepCache?.set(config.target, selector);
    }

    await page.locator(selector).hover({ timeout: 10000 });
    return {};
  },

  SELECT: async (page, config, ctx) => {
    if (!config.target) throw new Error("Target is required for select step");
    if (!config.optionValue) throw new Error("Option value is required");

    let selector = ctx?.stepCache?.get(config.target);
    if (!selector) {
      selector = await resolveSelector(page, config.target);
      ctx?.stepCache?.set(config.target, selector);
    }

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
};
