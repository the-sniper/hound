import { anthropic } from "./client";
import { LOCATOR_SYSTEM_PROMPT } from "./prompts";
import type { LocatorResult, AIAgentContext } from "@/types/ai";

export async function findElement(
  description: string,
  context: AIAgentContext
): Promise<LocatorResult> {
  const userMessage = buildLocatorPrompt(description, context);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: LOCATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0];
  if (text.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  try {
    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as LocatorResult;
  } catch {
    return {
      selector: `text="${description}"`,
      confidence: 0.3,
      reasoning: "Failed to parse AI response, falling back to text selector",
    };
  }
}

function buildLocatorPrompt(
  description: string,
  context: AIAgentContext
): string {
  let prompt = `Find the element described as: "${description}"\n\n`;
  prompt += `Page URL: ${context.pageUrl}\n`;
  prompt += `Page Title: ${context.pageTitle}\n\n`;
  prompt += `Accessibility Tree:\n${context.accessibilityTree}\n`;

  if (context.previousSteps?.length) {
    prompt += `\nPrevious steps in this test:\n`;
    context.previousSteps.forEach((step, i) => {
      prompt += `${i + 1}. [${step.type}] ${step.description} - ${step.status}\n`;
    });
  }

  return prompt;
}
