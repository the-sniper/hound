import { createAIMessage } from "./client";

interface RemediationSuggestion {
  violation: string;
  fix: string;
  codeExample: string;
  priority: "high" | "medium" | "low";
}

const REMEDIATION_SYSTEM_PROMPT = `You are an accessibility expert. Given WCAG violations found during testing, provide specific code fixes.

Respond with valid JSON array:
[{
  "violation": "rule-id",
  "fix": "concise explanation of the fix",
  "codeExample": "HTML/ARIA code showing the correct implementation",
  "priority": "high" | "medium" | "low"
}]

Prioritize based on impact: critical/serious = high, moderate = medium, minor = low.
Provide the minimum code change needed. Use ARIA attributes when semantic HTML isn't sufficient.`;

export async function suggestA11yRemediation(
  violations: { ruleId: string; impact: string; description: string; target: string; html: string }[],
  anthropicKey?: string,
  openaiKey?: string
): Promise<RemediationSuggestion[]> {
  if (violations.length === 0) return [];

  const top = violations.slice(0, 10);

  try {
    const response = await createAIMessage({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: REMEDIATION_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Fix these accessibility violations:\n\n${top.map((v, i) =>
          `${i + 1}. [${v.impact}] ${v.ruleId}: ${v.description}\n   Target: ${v.target}\n   HTML: ${v.html}`
        ).join("\n\n")}`,
      }],
      anthropicKey,
      openaiKey,
    });

    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as RemediationSuggestion[];
    }
    return [];
  } catch {
    return [];
  }
}
