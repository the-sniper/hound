import { createAIMessage } from "./client";
import { FAILURE_ANALYSIS_SYSTEM_PROMPT } from "./prompts";
import type { FailureAnalysis, AIAgentContext } from "@/types/ai";

export async function analyzeFailure(
  stepDescription: string,
  stepType: string,
  error: string,
  context: AIAgentContext
): Promise<FailureAnalysis> {
  let prompt = `A test step failed.\n\n`;
  prompt += `Step Type: ${stepType}\n`;
  prompt += `Step Description: "${stepDescription}"\n`;
  prompt += `Error: ${error}\n\n`;
  prompt += `Page URL: ${context.pageUrl}\n`;
  prompt += `Page Title: ${context.pageTitle}\n\n`;
  prompt += `Accessibility Tree:\n${context.accessibilityTree}\n`;

  if (context.previousSteps?.length) {
    prompt += `\nPrevious steps:\n`;
    context.previousSteps.forEach((step, i) => {
      prompt += `${i + 1}. [${step.type}] ${step.description} - ${step.status}\n`;
    });
  }

  try {
    const response = await createAIMessage({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: FAILURE_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as FailureAnalysis;
  } catch {
    return {
      summary: "Analysis unavailable",
      rootCause: error,
      suggestedFix: "Review the error and page state manually",
      confidence: 0,
    };
  }
}
