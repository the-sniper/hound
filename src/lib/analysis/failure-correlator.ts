import { createAIMessage } from "../ai/client";

interface CorrelationResult {
  probableCause: string;
  file: string;
  line?: number;
  confidence: number;
  explanation: string;
  suggestedFix: string;
}

const CORRELATOR_PROMPT = `You are a code analysis expert. Given a test failure and a git diff, identify the most likely code change that caused the failure.

Respond with valid JSON:
{
  "probableCause": "brief summary",
  "file": "path/to/file.ts",
  "line": 42,
  "confidence": 0.85,
  "explanation": "detailed explanation of why this change likely caused the failure",
  "suggestedFix": "what to do to fix it"
}

If you cannot determine the cause, set confidence to 0 and explain why.`;

export async function correlateFailureToCode(
  failureDetails: {
    stepType: string;
    stepDescription: string;
    error: string;
    pageUrl: string;
  },
  gitDiff: string,
  anthropicKey?: string | null,
  openaiKey?: string | null
): Promise<CorrelationResult> {
  try {
    const response = await createAIMessage({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: CORRELATOR_PROMPT,
      messages: [{
        role: "user",
        content: `Test Failure:
Step: ${failureDetails.stepDescription}
Type: ${failureDetails.stepType}
Error: ${failureDetails.error}
Page: ${failureDetails.pageUrl}

Git Diff (recent changes):
${gitDiff.substring(0, 6000)}`,
      }],
      anthropicKey,
      openaiKey,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as CorrelationResult;
    }

    return {
      probableCause: "Unable to determine",
      file: "unknown",
      confidence: 0,
      explanation: "Could not parse analysis result",
      suggestedFix: "Review the failure manually",
    };
  } catch {
    return {
      probableCause: "Analysis unavailable",
      file: "unknown",
      confidence: 0,
      explanation: "Correlation agent encountered an error",
      suggestedFix: "Review the failure manually",
    };
  }
}

export type { CorrelationResult };
