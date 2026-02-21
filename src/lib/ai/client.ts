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
  }
): Promise<AIResponse> {
  // Try Anthropic first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await anthropic.messages.create({
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("No AI API keys available. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
  }

  // Convert Anthropic format to OpenAI format
  const systemMessage = params.system ? { role: "system" as const, content: params.system } : null;
  const openaiMessages = [
    ...(systemMessage ? [systemMessage] : []),
    ...params.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user" as const,
      content: m.content,
    })),
  ];

  const response = await openai.chat.completions.create({
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
