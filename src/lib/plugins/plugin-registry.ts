import { db } from "@/lib/db";
import type { HoundPlugin, PluginContext, StepPlugin } from "./plugin-api";

const loadedPlugins: Map<string, HoundPlugin> = new Map();

export async function loadPlugin(
  entrypoint: string
): Promise<HoundPlugin | null> {
  try {
    const mod = await import(/* webpackIgnore: true */ entrypoint);
    const plugin: HoundPlugin = mod.default || mod;
    return plugin;
  } catch (error) {
    console.error(`Failed to load plugin ${entrypoint}:`, error);
    return null;
  }
}

export async function getProjectPlugins(
  projectId: string
): Promise<{ plugin: HoundPlugin; config: Record<string, unknown> }[]> {
  const installs = await db.projectPlugin.findMany({
    where: { projectId, enabled: true },
    include: { plugin: true },
  });

  const results: {
    plugin: HoundPlugin;
    config: Record<string, unknown>;
  }[] = [];

  for (const install of installs) {
    const cacheKey = `${install.plugin.name}@${install.plugin.version}`;

    if (!loadedPlugins.has(cacheKey)) {
      const loaded = await loadPlugin(install.plugin.entrypoint);
      if (loaded) {
        loadedPlugins.set(cacheKey, loaded);
      }
    }

    const loaded = loadedPlugins.get(cacheKey);
    if (loaded) {
      results.push({
        plugin: loaded,
        config: (install.config as Record<string, unknown>) || {},
      });
    }
  }

  return results;
}

export async function getPluginStepHandlers(
  projectId: string
): Promise<
  Map<
    string,
    { execute: StepPlugin["execute"]; config: Record<string, unknown> }
  >
> {
  const plugins = await getProjectPlugins(projectId);
  const handlers = new Map<
    string,
    { execute: StepPlugin["execute"]; config: Record<string, unknown> }
  >();

  for (const { plugin, config } of plugins) {
    if (plugin.steps) {
      for (const step of plugin.steps) {
        handlers.set(step.type, { execute: step.execute, config });
      }
    }
  }

  return handlers;
}

export async function runReporterHooks(
  projectId: string,
  hook: "onRunStart" | "onStepComplete" | "onRunComplete",
  data: Record<string, unknown>,
  runId: string
): Promise<void> {
  const plugins = await getProjectPlugins(projectId);

  for (const { plugin, config } of plugins) {
    const reporter = plugin.reporter;
    if (!reporter?.[hook]) continue;

    const ctx: PluginContext = { projectId, runId, config };
    try {
      if (hook === "onRunStart") {
        await reporter.onRunStart!(runId, ctx);
      } else if (hook === "onStepComplete") {
        await reporter.onStepComplete!(data, ctx);
      } else {
        await reporter.onRunComplete!(data, ctx);
      }
    } catch (error) {
      console.error(`Plugin reporter ${plugin.name}.${hook} error:`, error);
    }
  }
}
