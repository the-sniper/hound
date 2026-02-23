import { createAIMessage } from "./client";
import type { AIAgentContext } from "@/types/ai";

export interface RecoveryAction {
  action:
    | "dismiss_modal"
    | "wait_for_element"
    | "scroll_into_view"
    | "refresh_page"
    | "close_popup"
    | "none";
  selector?: string;
  waitMs?: number;
  reasoning: string;
  confidence: number;
}

const RECOVERY_SYSTEM_PROMPT = `You are a test recovery agent. When a test step fails, you analyze the page state and suggest a recovery action.

You must respond with valid JSON:
{
  "action": "dismiss_modal" | "wait_for_element" | "scroll_into_view" | "refresh_page" | "close_popup" | "none",
  "selector": "CSS selector if applicable",
  "waitMs": 2000,
  "reasoning": "why this recovery action should help",
  "confidence": 0.8
}

Recovery strategies:
- dismiss_modal: Click a close button, overlay, or escape key to dismiss a blocking modal/dialog
- wait_for_element: Wait for a specific element to appear (page still loading)
- scroll_into_view: Scroll the target element into the viewport
- refresh_page: Reload the page (last resort for stuck states)
- close_popup: Close cookie banners, notification bars, or popups
- none: No recovery possible, the failure is a genuine test failure

Only suggest recovery if you're confident the failure is transient (modal blocking click, element not yet loaded, element out of viewport). If the failure looks like a genuine application bug, use "none".`;

export async function suggestRecovery(
  stepDescription: string,
  stepType: string,
  error: string,
  context: AIAgentContext
): Promise<RecoveryAction> {
  try {
    const response = await createAIMessage({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: RECOVERY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Step failed. Analyze and suggest recovery.

Step: ${stepDescription}
Type: ${stepType}
Error: ${error}
Page URL: ${context.pageUrl}
Page Title: ${context.pageTitle}

Accessibility Tree:
${context.accessibilityTree}

Previous Steps:
${context.previousSteps?.map((s) => `- [${s.status}] ${s.type}: ${s.description}`).join("\n") || "None"}`,
        },
      ],
      anthropicKey: context.anthropicKey,
      openaiKey: context.openaiKey,
    });

    const text = response.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as RecoveryAction;
    }

    return {
      action: "none",
      reasoning: "Could not parse recovery suggestion",
      confidence: 0,
    };
  } catch {
    return {
      action: "none",
      reasoning: "Recovery agent error",
      confidence: 0,
    };
  }
}
