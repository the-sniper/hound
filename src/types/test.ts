import type { StepType, TestStatus } from "@/generated/prisma";

export type { StepType, TestStatus };

export interface StepConfig {
  url?: string;
  target?: string;
  value?: string;
  duration?: number;
  urlPattern?: string;
  expectedText?: string;
  assertion?: string;
  query?: string;
  schema?: Record<string, unknown>;
  code?: string;
  key?: string;
  direction?: "up" | "down" | "left" | "right";
  amount?: number;
  optionValue?: string;
}

export interface TestWithSteps {
  id: string;
  name: string;
  description: string | null;
  status: TestStatus;
  tags: string[];
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  steps: {
    id: string;
    orderIndex: number;
    type: StepType;
    description: string;
    config: StepConfig;
    testId: string;
  }[];
}

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  NAVIGATE: "Navigate",
  CLICK: "Click",
  TYPE: "Type",
  WAIT: "Wait",
  WAIT_FOR_URL: "Wait for URL",
  ASSERT_TEXT: "Assert Text",
  ASSERT_ELEMENT: "Assert Element",
  ASSERT_VISUAL: "Assert Visual",
  AI_CHECK: "AI Check",
  AI_EXTRACT: "AI Extract",
  AI_ACTION: "AI Action",
  JAVASCRIPT: "JavaScript",
  SCREENSHOT: "Screenshot",
  HOVER: "Hover",
  SELECT: "Select",
  PRESS_KEY: "Press Key",
  SCROLL: "Scroll",
};

export const STEP_TYPE_CATEGORIES = {
  navigation: ["NAVIGATE", "WAIT", "WAIT_FOR_URL"] as StepType[],
  interaction: [
    "CLICK",
    "TYPE",
    "HOVER",
    "SELECT",
    "PRESS_KEY",
    "SCROLL",
  ] as StepType[],
  assertion: ["ASSERT_TEXT", "ASSERT_ELEMENT", "ASSERT_VISUAL"] as StepType[],
  ai: ["AI_CHECK", "AI_EXTRACT", "AI_ACTION"] as StepType[],
  advanced: ["JAVASCRIPT", "SCREENSHOT"] as StepType[],
};
