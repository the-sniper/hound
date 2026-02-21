import { anthropic } from "./client";
import { ASSERTION_SYSTEM_PROMPT } from "./prompts";
import type { AssertionResult, AIAgentContext } from "@/types/ai";

export async function checkAssertion(
  assertion: string,
  context: AIAgentContext
): Promise<AssertionResult> {
  let prompt = `Verify this assertion: "${assertion}"\n\n`;
  prompt += `Page URL: ${context.pageUrl}\n`;
  prompt += `Page Title: ${context.pageTitle}\n\n`;
  prompt += `Accessibility Tree:\n${context.accessibilityTree}\n`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: ASSERTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  try {
    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as AssertionResult;
  } catch {
    return {
      passed: false,
      explanation: "Failed to parse AI assertion response",
      evidence: [],
    };
  }
}
