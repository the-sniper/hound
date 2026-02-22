import { createAIMessage } from "./client";
import { LOCATOR_SYSTEM_PROMPT } from "./prompts";
import type { LocatorResult, AIAgentContext } from "@/types/ai";

export async function findElement(
  description: string,
  context: AIAgentContext
): Promise<LocatorResult> {
  const userMessage = buildLocatorPrompt(description, context);

  try {
    const response = await createAIMessage({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: LOCATOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      anthropicKey: context.anthropicKey,
      openaiKey: context.openaiKey,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
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
  
  // Add form elements information
  if (context.formElements && context.formElements.length > 0) {
    prompt += `Form Elements on Page:\n`;
    context.formElements.forEach((el, i) => {
      prompt += `[${i + 1}] <${el.tag}`;
      if (el.type) prompt += ` type="${el.type}"`;
      if (el.name) prompt += ` name="${el.name}"`;
      if (el.id) prompt += ` id="${el.id}"`;
      if (el.placeholder) prompt += ` placeholder="${el.placeholder}"`;
      if (el.ariaLabel) prompt += ` aria-label="${el.ariaLabel}"`;
      prompt += `>\n`;
    });
    prompt += `\n`;
  }
  
  prompt += `Accessibility Tree:\n${context.accessibilityTree}\n`;

  if (context.previousSteps?.length) {
    prompt += `\nPrevious steps in this test:\n`;
    context.previousSteps.forEach((step, i) => {
      prompt += `${i + 1}. [${step.type}] ${step.description} - ${step.status}\n`;
    });
  }
  
  prompt += `\nReturn a JSON object with:
- selector: A Playwright CSS selector or locator string
- confidence: Number 0-1
- reasoning: Brief explanation of why this selector was chosen

Example selectors:
- input[name="email"] or [name="email"]
- input[type="email"]
- input[placeholder="you@example.com"]
- #email
- text="Email Address" (for labels)
`;

  return prompt;
}
