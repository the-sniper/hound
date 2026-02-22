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

const TEST_GENERATOR_PROMPT = `You are an expert test automation engineer. Generate end-to-end test steps from a natural language description.

Available step types and their configs:
- NAVIGATE: { url: string }
- CLICK: { target: "CSS selector" }
- TYPE: { target: "CSS selector", value: "text to type" }
- WAIT: { duration: number (ms) }
- WAIT_FOR_URL: { urlPattern: "regex or glob" }
- ASSERT_TEXT: { expectedText: "text to find", target?: "CSS selector" }
- ASSERT_ELEMENT: { target: "CSS selector" }
- ASSERT_VISUAL: {}
- AI_CHECK: { assertion: "description of what to verify" }
- AI_ACTION: { query: "description of what to do" }
- JAVASCRIPT: { code: "JavaScript to execute" }
- SCREENSHOT: {}
- HOVER: { target: "CSS selector" }
- SELECT: { target: "CSS selector", optionValue: "value" }
- PRESS_KEY: { key: "key name" }
- SCROLL: { direction: "up"|"down"|"left"|"right", amount: number }
- ASSERT_ACCESSIBLE: { wcagLevel: "AA" }
- SECURITY_SCAN: { scanTypes: ["headers", "cookies", "mixed_content", "csrf", "xss"] }

Rules:
- Use realistic CSS selectors (prefer [data-testid], button text, input labels)
- Add appropriate waits between navigation and assertions
- Include assertions to verify expected outcomes
- Start with NAVIGATE to the target page
- Use AI_CHECK for complex visual/behavioral assertions
- Keep descriptions concise and action-oriented

Respond with valid JSON:
{
  "name": "test name",
  "description": "what this test verifies",
  "steps": [
    { "type": "STEP_TYPE", "description": "human-readable description", "config": { ... } }
  ]
}`;

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

  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse generated test");

  const generated = JSON.parse(jsonMatch[0]) as GeneratedTest;

  generated.steps = generated.steps.filter(
    (s) => VALID_STEP_TYPES.includes(s.type)
  );

  if (generated.steps.length === 0) {
    throw new Error("No valid steps generated");
  }

  return generated;
}

export async function generateTestFromUrl(
  targetUrl: string,
  pageContent: string,
  anthropicKey?: string | null,
  openaiKey?: string | null
): Promise<GeneratedTest[]> {
  const response = await createAIMessage({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: `You are an expert QA engineer. Analyze a web page and generate comprehensive E2E tests.

Given a page's URL and content (accessibility tree), generate multiple test cases covering:
1. Happy path user flows
2. Form validation
3. Navigation flows
4. Error handling
5. Edge cases

Use the same step types as in test generation. Respond with a JSON array of test objects:
[{ "name": "...", "description": "...", "steps": [...] }]`,
    messages: [{
      role: "user",
      content: `URL: ${targetUrl}\n\nPage content:\n${pageContent.substring(0, 8000)}`,
    }],
    anthropicKey,
    openaiKey,
  });

  const jsonMatch = response.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse generated tests");

  return JSON.parse(jsonMatch[0]) as GeneratedTest[];
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

  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse refined test");

  return JSON.parse(jsonMatch[0]) as GeneratedTest;
}

export type { GeneratedStep, GeneratedTest };
