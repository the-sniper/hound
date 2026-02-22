import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const globalForAI = globalThis as unknown as {
  anthropic: Anthropic | undefined;
  openai: OpenAI | undefined;
};

// Initialize Anthropic client
export const anthropic =
  globalForAI.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

// Initialize OpenAI client
export const openai =
  globalForAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForAI.anthropic = anthropic;
  globalForAI.openai = openai;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: "anthropic" | "openai";
}

export async function createAIMessage(
  params: {
    model: string;
    max_tokens: number;
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    anthropicKey?: string | null;
    openaiKey?: string | null;
  }
): Promise<AIResponse> {
  const anthropicApiKey = params.anthropicKey || process.env.ANTHROPIC_API_KEY;
  const openaiApiKey = params.openaiKey || process.env.OPENAI_API_KEY;

  // Try Anthropic first
  if (anthropicApiKey) {
    try {
      const anthropicClient = params.anthropicKey 
        ? new Anthropic({ apiKey: params.anthropicKey })
        : anthropic;

      const response = await anthropicClient.messages.create({
        model: params.model,
        max_tokens: params.max_tokens,
        system: params.system,
        messages: params.messages,
      });

      const content = response.content[0];
      if (content.type === "text") {
        return {
          content: content.text,
          model: params.model,
          provider: "anthropic",
        };
      }
    } catch (error) {
      console.warn("Anthropic API failed, trying OpenAI fallback:", error);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  if (!openaiApiKey) {
    throw new Error("No AI API keys available. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
  }

  // Convert Anthropic format to OpenAI format
  const systemMessage = params.system ? { role: "system" as const, content: params.system } : null;
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...(systemMessage ? [systemMessage] : []),
    ...params.messages.map((m) => {
      if (m.role === "assistant") {
        return { role: "assistant" as const, content: m.content };
      }
      return { role: "user" as const, content: m.content };
    }),
  ];

  const openaiClient = params.openaiKey
    ? new OpenAI({ apiKey: params.openaiKey })
    : openai;

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini", // Use GPT-4o mini as fallback
    max_tokens: params.max_tokens,
    messages: openaiMessages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return {
    content,
    model: "gpt-4o-mini",
    provider: "openai",
  };
}
