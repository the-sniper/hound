import type { Page } from "playwright";

export interface PluginContext {
  projectId: string;
  runId?: string;
  config: Record<string, unknown>;
}

export interface StepPlugin {
  type: string;
  label: string;
  execute: (
    page: Page,
    config: Record<string, unknown>,
    ctx: PluginContext
  ) => Promise<Record<string, unknown>>;
}

export interface ReporterPlugin {
  name: string;
  onRunStart?: (runId: string, ctx: PluginContext) => Promise<void>;
  onStepComplete?: (
    stepResult: Record<string, unknown>,
    ctx: PluginContext
  ) => Promise<void>;
  onRunComplete?: (
    runResult: Record<string, unknown>,
    ctx: PluginContext
  ) => Promise<void>;
}

export interface AnalyzerPlugin {
  name: string;
  analyze: (
    page: Page,
    ctx: PluginContext
  ) => Promise<Record<string, unknown>>;
}

export interface HoundPlugin {
  name: string;
  version: string;
  description?: string;
  category: "step" | "reporter" | "analyzer" | "integration";

  steps?: StepPlugin[];
  reporter?: ReporterPlugin;
  analyzer?: AnalyzerPlugin;

  onInstall?: (ctx: PluginContext) => Promise<void>;
  onUninstall?: (ctx: PluginContext) => Promise<void>;
}
