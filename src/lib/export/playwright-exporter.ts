interface ExportOptions {
  testName: string;
  testDescription?: string;
  steps: {
    type: string;
    description: string;
    config: Record<string, unknown>;
  }[];
  baseUrl?: string;
}

function escapeString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

function escapeBacktickString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

function mapStepToCode(
  step: { type: string; description: string; config: Record<string, unknown> },
  index: number
): string {
  const c = step.config;
  const comment = `  // Step ${index + 1}: ${step.description}`;

  switch (step.type) {
    case "NAVIGATE":
      return `${comment}\n  await page.goto('${escapeString(String(c.url ?? ""))}', { waitUntil: 'domcontentloaded' });`;

    case "CLICK":
      return `${comment}\n  await page.locator('${escapeString(String(c.target ?? ""))}').click();`;

    case "TYPE":
      return `${comment}\n  await page.locator('${escapeString(String(c.target ?? ""))}').fill('${escapeString(String(c.value ?? ""))}');`;

    case "WAIT":
      return `${comment}\n  await page.waitForTimeout(${Number(c.duration ?? 1000)});`;

    case "WAIT_FOR_URL":
      return `${comment}\n  await page.waitForURL('${escapeString(String(c.urlPattern ?? ""))}');`;

    case "ASSERT_TEXT":
      return `${comment}\n  await expect(page.locator('body')).toContainText('${escapeString(String(c.expectedText ?? ""))}');`;

    case "ASSERT_ELEMENT":
      return `${comment}\n  await expect(page.locator('${escapeString(String(c.target ?? ""))}')).toBeVisible();`;

    case "ASSERT_VISUAL":
      return `${comment}\n  await expect(page).toHaveScreenshot();`;

    case "AI_CHECK":
      return `${comment}\n  // AI Check: ${step.description} (requires manual implementation)`;

    case "AI_EXTRACT":
      return `${comment}\n  // AI Extract: ${step.description} (requires manual implementation)`;

    case "AI_ACTION":
      return `${comment}\n  // AI Action: ${step.description} (requires manual implementation)`;

    case "JAVASCRIPT":
      return `${comment}\n  await page.evaluate(\`${escapeBacktickString(String(c.code ?? ""))}\`);`;

    case "SCREENSHOT": {
      const filename = String(c.value ?? `screenshot-step-${index + 1}.png`);
      return `${comment}\n  await page.screenshot({ path: '${escapeString(filename)}' });`;
    }

    case "HOVER":
      return `${comment}\n  await page.locator('${escapeString(String(c.target ?? ""))}').hover();`;

    case "SELECT":
      return `${comment}\n  await page.locator('${escapeString(String(c.target ?? ""))}').selectOption('${escapeString(String(c.optionValue ?? c.value ?? ""))}');`;

    case "PRESS_KEY":
      return `${comment}\n  await page.keyboard.press('${escapeString(String(c.key ?? ""))}');`;

    case "SCROLL": {
      const dir = String(c.direction ?? "down");
      const amt = Number(c.amount ?? 300);
      const deltaX = dir === "left" ? -amt : dir === "right" ? amt : 0;
      const deltaY = dir === "up" ? -amt : dir === "down" ? amt : 0;
      return `${comment}\n  await page.mouse.wheel(${deltaX}, ${deltaY});`;
    }

    case "SAVE_AUTH":
      return `${comment}\n  const state = await page.context().storageState();`;

    case "LOAD_AUTH":
      return `${comment}\n  // Load auth state: ${c.authStateName ?? "default"}`;

    case "MOCK_ROUTE": {
      const pattern = escapeString(String(c.mockUrlPattern ?? ""));
      const status = Number(c.mockStatusCode ?? 200);
      const body = escapeString(String(c.mockResponseBody ?? ""));
      return `${comment}\n  await page.route('${pattern}', route => route.fulfill({ status: ${status}, body: '${body}' }));`;
    }

    case "REMOVE_MOCK":
      return `${comment}\n  await page.unroute('${escapeString(String(c.mockUrlPattern ?? ""))}');`;

    case "CONDITIONAL":
      return `${comment}\n  // Conditional: ${step.description}`;

    case "SKIP_IF":
      return `${comment}\n  // Skip if: ${step.description}`;

    default:
      return `${comment}\n  // Unsupported step type: ${step.type}`;
  }
}

export function exportToPlaywright(options: ExportOptions): string {
  const { testName, testDescription, steps, baseUrl } = options;

  const lines: string[] = [];

  lines.push("import { test, expect } from '@playwright/test';");
  lines.push("");

  if (baseUrl) {
    lines.push(`// Base URL: ${baseUrl}`);
  }
  if (testDescription) {
    lines.push(`// ${testDescription}`);
  }
  if (baseUrl || testDescription) {
    lines.push("");
  }

  lines.push(`test('${escapeString(testName)}', async ({ page }) => {`);

  for (let i = 0; i < steps.length; i++) {
    if (i > 0) lines.push("");
    lines.push(mapStepToCode(steps[i], i));
  }

  lines.push("});");
  lines.push("");

  return lines.join("\n");
}
