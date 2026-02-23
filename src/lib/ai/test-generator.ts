import { createAIMessage } from "./client";

interface GeneratedStep {
  type: string;
  description: string;
  config: Record<string, unknown>;
}

interface GeneratedTest {
  name: string;
  description: string;
  steps: GeneratedStep[];
}

const VALID_STEP_TYPES = [
  "NAVIGATE", "CLICK", "TYPE", "WAIT", "WAIT_FOR_URL",
  "ASSERT_TEXT", "ASSERT_ELEMENT", "ASSERT_VISUAL",
  "AI_CHECK", "AI_EXTRACT", "AI_ACTION",
  "JAVASCRIPT", "SCREENSHOT", "HOVER", "SELECT", "PRESS_KEY", "SCROLL",
  "SAVE_AUTH", "LOAD_AUTH", "MOCK_ROUTE", "REMOVE_MOCK",
  "CONDITIONAL", "SKIP_IF", "ASSERT_ACCESSIBLE", "SECURITY_SCAN",
];

/**
 * Sanitize a JSON string from an AI response by removing common issues:
 * - JavaScript comments (// and block comments)
 * - Trailing commas before } or ]
 * - Ellipsis patterns
 * - Markdown code fences
 */
function sanitizeJSON(text: string): string {
  // Strip markdown code fences
  let result = text
    .replace(/```(?:json)?\s*/g, "")
    .replace(/```\s*/g, "");

  // Strip single-line and multi-line comments (outside of strings)
  let cleaned = "";
  let i = 0;
  let inString = false;
  let escaped = false;

  while (i < result.length) {
    const ch = result[i];

    if (escaped) {
      cleaned += ch;
      escaped = false;
      i++;
      continue;
    }

    if (ch === "\\" && inString) {
      cleaned += ch;
      escaped = true;
      i++;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      cleaned += ch;
      i++;
      continue;
    }

    if (inString) {
      cleaned += ch;
      i++;
      continue;
    }

    // Single-line comment
    if (ch === "/" && i + 1 < result.length && result[i + 1] === "/") {
      while (i < result.length && result[i] !== "\n") i++;
      continue;
    }

    // Multi-line comment
    if (ch === "/" && i + 1 < result.length && result[i + 1] === "*") {
      i += 2;
      while (i + 1 < result.length && !(result[i] === "*" && result[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    cleaned += ch;
    i++;
  }

  // Remove trailing commas before ] or }
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // Remove ellipsis patterns (AI sometimes writes "..." as placeholder)
  cleaned = cleaned.replace(/\.\.\./g, "");

  return cleaned.trim();
}

/**
 * Extract a balanced JSON structure from a string.
 * Tracks bracket/brace depth to find the correct closing delimiter.
 */
function extractJSON(text: string, opener: "{" | "["): string | null {
  const closer = opener === "{" ? "}" : "]";
  const start = text.indexOf(opener);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === opener) depth++;
    else if (ch === closer) {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * Parse JSON from an AI response with aggressive sanitization.
 */
function parseJSONFromAI<T>(content: string, type: "{" | "["): T {
  const sanitized = sanitizeJSON(content);
  const extracted = extractJSON(sanitized, type);

  if (!extracted) {
    throw new Error("No JSON found in AI response");
  }

  try {
    return JSON.parse(extracted) as T;
  } catch {
    // Last resort: try to fix common remaining issues
    const lastResort = extracted
      .replace(/,\s*([}\]])/g, "$1")  // trailing commas again after extraction
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');  // unquoted keys

    return JSON.parse(lastResort) as T;
  }
}

const STEP_TYPES_DOC = `Available step types:
- NAVIGATE: { "url": "string" }
- CLICK: { "target": "CSS selector" }
- TYPE: { "target": "CSS selector", "value": "text" }
- WAIT: { "duration": 1000 }
- WAIT_FOR_URL: { "urlPattern": "pattern" }
- ASSERT_TEXT: { "expectedText": "text", "target": "CSS selector" }
- ASSERT_ELEMENT: { "target": "CSS selector" }
- AI_CHECK: { "assertion": "what to verify" }
- AI_ACTION: { "query": "what to do" }
- SCREENSHOT: {}
- HOVER: { "target": "CSS selector" }
- SELECT: { "target": "CSS selector", "optionValue": "value" }
- PRESS_KEY: { "key": "key name" }
- SCROLL: { "direction": "down", "amount": 500 }
- ASSERT_ACCESSIBLE: { "wcagLevel": "AA" }
- SECURITY_SCAN: { "scanTypes": ["headers","cookies"] }`;

const TEST_GENERATOR_PROMPT = `You are a test automation engineer. Generate test steps as JSON.

${STEP_TYPES_DOC}

Rules:
- Use realistic CSS selectors (prefer [data-testid], role, label)
- Start with NAVIGATE
- Include assertions
- NO comments in JSON, NO trailing commas, NO ellipsis

Output ONLY this JSON (nothing else):
{"name":"test name","description":"what it tests","steps":[{"type":"TYPE","description":"desc","config":{}}]}`;

export async function generateTest(
  userDescription: string,
  baseUrl: string,
  anthropicKey?: string | null,
  openaiKey?: string | null
): Promise<GeneratedTest> {
  const response = await createAIMessage({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: TEST_GENERATOR_PROMPT,
    messages: [{
      role: "user",
      content: `Base URL: ${baseUrl}\n\nGenerate a test for:\n${userDescription}`,
    }],
    anthropicKey,
    openaiKey,
  });

  const generated = parseJSONFromAI<GeneratedTest>(response.content, "{");

  generated.steps = generated.steps.filter(
    (s) => VALID_STEP_TYPES.includes(s.type)
  );

  if (generated.steps.length === 0) {
    throw new Error("No valid steps generated");
  }

  return generated;
}

/**
 * Fetch a lightweight text representation of a web page for AI analysis.
 */
async function fetchPageSnapshot(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HoundBot/1.0)",
        "Accept": "text/html",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return `[Could not fetch page: HTTP ${res.status}]`;

    const html = await res.text();

    // Extract a lightweight summary: title, meta, headings, forms, links, buttons
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDesc = metaMatch ? metaMatch[1] : "";

    // Extract form inputs
    const inputRegex = /<input[^>]*>/gi;
    const inputs: string[] = [];
    let inputMatch;
    while ((inputMatch = inputRegex.exec(html)) !== null) {
      const tag = inputMatch[0];
      const type = (tag.match(/type=["']([^"']*)["']/i) || [])[1] || "text";
      const name = (tag.match(/name=["']([^"']*)["']/i) || [])[1] || "";
      const placeholder = (tag.match(/placeholder=["']([^"']*)["']/i) || [])[1] || "";
      const id = (tag.match(/id=["']([^"']*)["']/i) || [])[1] || "";
      inputs.push(`<input type="${type}" name="${name}" id="${id}" placeholder="${placeholder}">`);
    }

    // Extract buttons
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
    const buttons: string[] = [];
    let buttonMatch;
    while ((buttonMatch = buttonRegex.exec(html)) !== null) {
      const text = buttonMatch[1].replace(/<[^>]*>/g, "").trim();
      if (text) buttons.push(`<button>${text}</button>`);
    }

    // Extract links (limit to 20)
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: string[] = [];
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 20) {
      const text = linkMatch[2].replace(/<[^>]*>/g, "").trim();
      if (text) links.push(`<a href="${linkMatch[1]}">${text}</a>`);
    }

    // Extract headings
    const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
    const headings: string[] = [];
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      const text = headingMatch[1].replace(/<[^>]*>/g, "").trim();
      if (text) headings.push(text);
    }

    return [
      `Title: ${title}`,
      metaDesc ? `Description: ${metaDesc}` : "",
      headings.length ? `Headings: ${headings.join(", ")}` : "",
      inputs.length ? `\nForm inputs:\n${inputs.join("\n")}` : "",
      buttons.length ? `\nButtons:\n${buttons.join("\n")}` : "",
      links.length ? `\nLinks:\n${links.join("\n")}` : "",
    ].filter(Boolean).join("\n");
  } catch (err) {
    return `[Could not fetch page: ${(err as Error).message}]`;
  }
}

export async function generateTestFromUrl(
  targetUrl: string,
  pageContent: string,
  anthropicKey?: string | null,
  openaiKey?: string | null
): Promise<GeneratedTest[]> {
  // Fetch actual page content if not provided
  const content = pageContent?.trim() || await fetchPageSnapshot(targetUrl);

  const response = await createAIMessage({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a test automation engineer. Analyze a web page and generate ONE comprehensive E2E test.

${STEP_TYPES_DOC}

Rules:
- Generate a SINGLE test with 5-12 steps covering the main user flow
- Use realistic selectors based on the page content provided
- Start with NAVIGATE to the URL
- NO comments, NO trailing commas, NO ellipsis in JSON

Output ONLY this JSON object (nothing else before or after):
{"name":"test name","description":"what it tests","steps":[{"type":"NAVIGATE","description":"desc","config":{"url":"..."}}]}`,
    messages: [{
      role: "user",
      content: `URL: ${targetUrl}\n\nPage structure:\n${content.substring(0, 6000)}`,
    }],
    anthropicKey,
    openaiKey,
  });

  // Parse as single test object, wrap in array for compatibility
  const test = parseJSONFromAI<GeneratedTest>(response.content, "{");

  test.steps = test.steps.filter(
    (s) => VALID_STEP_TYPES.includes(s.type)
  );

  return [test];
}

export async function refineTest(
  test: GeneratedTest,
  feedback: string,
  anthropicKey?: string | null,
  openaiKey?: string | null
): Promise<GeneratedTest> {
  const response = await createAIMessage({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: TEST_GENERATOR_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the current test:\n${JSON.stringify(test, null, 2)}`,
      },
      {
        role: "assistant",
        content: JSON.stringify(test, null, 2),
      },
      {
        role: "user",
        content: `Please modify this test based on feedback:\n${feedback}`,
      },
    ],
    anthropicKey,
    openaiKey,
  });

  return parseJSONFromAI<GeneratedTest>(response.content, "{");
}

export type { GeneratedStep, GeneratedTest };
