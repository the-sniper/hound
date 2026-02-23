"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  Plug,
  Plus,
  Loader2,
  Settings,
  Package,
  Check,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  category: string;
  configSchema: Record<string, any>;
  createdAt: string;
}

interface InstalledPlugin {
  id: string;
  enabled: boolean;
  config: Record<string, any>;
  pluginId: string;
  plugin: PluginDefinition;
  createdAt: string;
}

export default function IntegrationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [availablePlugins, setAvailablePlugins] = useState<PluginDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  // Config dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configPlugin, setConfigPlugin] = useState<InstalledPlugin | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [installedRes, availableRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/plugins`),
        fetch("/api/plugins"),
      ]);

      if (installedRes.ok) {
        const data = await installedRes.json();
        setInstalledPlugins(Array.isArray(data) ? data : data.plugins || []);
      }
      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailablePlugins(Array.isArray(data) ? data : data.plugins || []);
      }
    } catch (error) {
      console.error("Failed to load plugins:", error);
    }
    setLoading(false);
  }

  async function handleInstall(pluginId: string) {
    setInstalling(pluginId);
    try {
      const res = await fetch(`/api/projects/${projectId}/plugins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId }),
      });
      if (res.ok) {
        toast.success("Plugin installed");
        await loadData();
      } else {
        toast.error("Failed to install plugin");
      }
    } catch {
      toast.error("Failed to install plugin");
    }
    setInstalling(null);
  }

  async function handleToggle(installId: string, enabled: boolean) {
    try {
      await fetch(`/api/projects/${projectId}/plugins/${installId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setInstalledPlugins(
        installedPlugins.map((p) => (p.id === installId ? { ...p, enabled } : p))
      );
    } catch {
      toast.error("Failed to toggle plugin");
    }
  }

  async function handleUninstall(installId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/plugins/${installId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Plugin uninstalled");
        setInstalledPlugins(installedPlugins.filter((p) => p.id !== installId));
      }
    } catch {
      toast.error("Failed to uninstall plugin");
    }
  }

  function openConfig(plugin: InstalledPlugin) {
    setConfigPlugin(plugin);
    setConfigValues(plugin.config || {});
    setConfigDialogOpen(true);
  }

  async function handleSaveConfig() {
    if (!configPlugin) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/plugins/${configPlugin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configValues }),
      });
      if (res.ok) {
        toast.success("Configuration saved");
        setConfigDialogOpen(false);
        await loadData();
      } else {
        toast.error("Failed to save configuration");
      }
    } catch {
      toast.error("Failed to save configuration");
    }
    setSavingConfig(false);
  }

  function getCategoryColor(category: string): string {
    switch (category.toLowerCase()) {
      case "notification": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "reporting": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "issue-tracking": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "ci-cd": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default: return "bg-muted text-muted-foreground border-border/50";
    }
  }

  const installedPluginIds = new Set(installedPlugins.map((p) => p.pluginId));
  const uninstalledPlugins = availablePlugins.filter((p) => !installedPluginIds.has(p.id));

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex items-center gap-6 mb-10 px-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-display font-bold tracking-tight flex items-center gap-3">
            <Plug className="h-8 w-8 text-primary" />
            Integrations
          </h1>
          <p className="text-lg text-muted-foreground font-medium mt-1">
            Connect Hound with your favorite tools
          </p>
        </div>
      </div>

      <div className="px-4 space-y-10">
        {/* Installed Plugins */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-display font-bold">Installed</h2>
            <Badge variant="outline" className="rounded-lg ml-1">{installedPlugins.length}</Badge>
          </div>

          {installedPlugins.length === 0 ? (
            <Card className="border-dashed border-2 rounded-[2rem]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plug className="h-10 w-10 text-muted-foreground/20 mb-4" />
                <p className="text-lg font-bold text-muted-foreground/60">No plugins installed</p>
                <p className="text-sm text-muted-foreground/40 mt-1">Browse available plugins below</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {installedPlugins.map((installed, i) => (
                <motion.div key={installed.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="rounded-2xl border-border/40 bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-300">
                    <CardContent className="flex items-center gap-4 p-5">
                      <Switch checked={installed.enabled} onCheckedChange={(checked) => handleToggle(installed.id, checked)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{installed.plugin.name}</p>
                          <span className="text-[10px] text-muted-foreground/50">v{installed.plugin.version}</span>
                        </div>
                        {installed.plugin.description && (
                          <p className="text-xs text-muted-foreground truncate">{installed.plugin.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`rounded-lg text-[10px] shrink-0 ${getCategoryColor(installed.plugin.category)}`}>
                        {installed.plugin.category}
                      </Badge>
                      <Button variant="ghost" size="sm" className="rounded-lg shrink-0" onClick={() => openConfig(installed)}>
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <Separator className="bg-border/20" />

        {/* Available Plugins */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Download className="h-5 w-5 text-muted-foreground/60" />
            <h2 className="text-xl font-display font-bold">Available</h2>
            <Badge variant="outline" className="rounded-lg ml-1">{uninstalledPlugins.length}</Badge>
          </div>

          {uninstalledPlugins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All available plugins are installed</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {uninstalledPlugins.map((plugin, i) => (
                <motion.div key={plugin.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="rounded-2xl border-border/40 bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-300 h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{plugin.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {plugin.author && <span>by {plugin.author} · </span>}
                            v{plugin.version}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={`rounded-lg text-[10px] ${getCategoryColor(plugin.category)}`}>
                          {plugin.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-4">
                      <p className="text-sm text-muted-foreground">{plugin.description || "No description"}</p>
                      <Button
                        size="sm"
                        className="rounded-xl w-full"
                        onClick={() => handleInstall(plugin.id)}
                        disabled={installing === plugin.id}
                      >
                        {installing === plugin.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Install
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg rounded-[2rem] border-border/40 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Configure {configPlugin?.plugin.name}
            </DialogTitle>
          </DialogHeader>
          {configPlugin && (
            <div className="space-y-4 mt-4">
              {Object.entries(configPlugin.plugin.configSchema || {}).length > 0 ? (
                Object.entries(configPlugin.plugin.configSchema).map(([key, schema]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                    <Input
                      value={configValues[key] || ""}
                      onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                      placeholder={schema.description || `Enter ${key}`}
                      type={schema.type === "password" ? "password" : "text"}
                      className="rounded-xl"
                    />
                    {schema.description && (
                      <p className="text-xs text-muted-foreground/60">{schema.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No configuration options available</p>
              )}
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
