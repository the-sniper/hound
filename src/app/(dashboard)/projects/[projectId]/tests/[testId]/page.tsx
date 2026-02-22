"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Play,
  Save,
  MoreVertical,
  Trash2,
  GripVertical,
  MousePointerClick,
  Keyboard,
  Eye,
  Clock,
  Code,
  Camera,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Loader2,
  History,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Step type definitions
const STEP_TYPES = [
  { type: "NAVIGATE", label: "Navigate", icon: ArrowRight, category: "Basic" },
  {
    type: "CLICK",
    label: "Click",
    icon: MousePointerClick,
    category: "Interaction",
  },
  { type: "TYPE", label: "Type", icon: Keyboard, category: "Interaction" },
  { type: "WAIT", label: "Wait", icon: Clock, category: "Timing" },
  {
    type: "WAIT_FOR_URL",
    label: "Wait for URL",
    icon: Clock,
    category: "Timing",
  },
  {
    type: "ASSERT_TEXT",
    label: "Assert Text",
    icon: CheckCircle,
    category: "Assertion",
  },
  {
    type: "ASSERT_ELEMENT",
    label: "Assert Element",
    icon: Eye,
    category: "Assertion",
  },
  {
    type: "ASSERT_VISUAL",
    label: "Assert Visual",
    icon: Camera,
    category: "Assertion",
  },
  { type: "AI_CHECK", label: "AI Check", icon: Sparkles, category: "AI" },
  { type: "AI_EXTRACT", label: "AI Extract", icon: Sparkles, category: "AI" },
  { type: "AI_ACTION", label: "AI Action", icon: Sparkles, category: "AI" },
  { type: "SCREENSHOT", label: "Screenshot", icon: Camera, category: "Debug" },
  {
    type: "HOVER",
    label: "Hover",
    icon: MousePointerClick,
    category: "Interaction",
  },
  {
    type: "SELECT",
    label: "Select",
    icon: MousePointerClick,
    category: "Interaction",
  },
  {
    type: "PRESS_KEY",
    label: "Press Key",
    icon: Keyboard,
    category: "Interaction",
  },
  {
    type: "SCROLL",
    label: "Scroll",
    icon: MousePointerClick,
    category: "Interaction",
  },
  { type: "JAVASCRIPT", label: "JavaScript", icon: Code, category: "Advanced" },
];

interface Step {
  id: string;
  orderIndex: number;
  type: string;
  description: string;
  config: Record<string, unknown>;
}

interface TestRun {
  id: string;
  status: string;
  createdAt: string;
  duration: number | null;
}

interface TestHealth {
  passRate: number | null;
  flakiness: number | null;
  trend: "improving" | "stable" | "declining" | "unknown";
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
}

interface Test {
  id: string;
  name: string;
  description: string | null;
  status: string;
  projectId: string;
  steps: Step[];
  runs: TestRun[];
  health: TestHealth;
}

interface Project {
  id: string;
  name: string;
  baseUrl: string;
}

interface Environment {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function TestEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [showStepPalette, setShowStepPalette] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<string>("");

  useEffect(() => {
    loadData();
  }, [projectId, testId]);

  async function loadData() {
    setLoading(true);
    try {
      const [testRes, projectRes] = await Promise.all([
        fetch(`/api/tests/${testId}`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (testRes.ok) {
        const testData = await testRes.json();
        setTest(testData);
        setSteps(testData.steps || []);

        // Update recently viewed
        const key = `recently_viewed_${projectId}`;
        const saved = localStorage.getItem(key);
        let list = saved ? JSON.parse(saved) : [];
        // Filter out current test if it exists
        list = list.filter((item: any) => item.id !== testId);
        // Add current test to start
        list.unshift({
          id: testId,
          name: testData.name,
          viewedAt: new Date().toISOString(),
        });
        // Keep only last 3
        localStorage.setItem(key, JSON.stringify(list.slice(0, 3)));
      }
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      // Load environments
      const envsRes = await fetch(`/api/projects/${projectId}/environments`);
      if (envsRes.ok) {
        const envsData = await envsRes.json();
        setEnvironments(envsData);
        const defaultEnv = envsData.find((e: Environment) => e.isDefault);
        if (defaultEnv) {
          setSelectedEnvironmentId(defaultEnv.id);
        }
      }
    } catch (error) {
      console.error("Failed to load test:", error);
      toast.error("Failed to load test");
    }
    setLoading(false);
  }

  async function handleSaveSteps() {
    setSaving(true);
    try {
      // Save all steps (order and any pending changes)
      const stepsToSave = steps.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        type: s.type,
        description: s.description,
        config: s.config,
      }));

      const res = await fetch(`/api/tests/${testId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepsToSave),
      });

      if (res.ok) {
        const savedSteps = await res.json();
        setSteps(savedSteps);
        toast.success("Steps saved");
      } else {
        toast.error("Failed to save steps");
      }
    } catch (error) {
      toast.error("Failed to save steps");
    }
    setSaving(false);
  }

  async function handleRunTest() {
    setRunning(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          projectId,
          environmentId:
            selectedEnvironmentId && selectedEnvironmentId !== "none"
              ? selectedEnvironmentId
              : undefined,
        }),
      });

      if (res.ok) {
        const run = await res.json();
        toast.success("Test run started");
        router.push(`/projects/${projectId}/tests/${testId}/runs/${run.id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start test run");
      }
    } catch (error) {
      toast.error("Failed to start test run");
    }
    setRunning(false);
  }

  async function handleUpdateTest(name?: string, description?: string) {
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTest(updated);
        toast.success("Test updated");
      }
    } catch (error) {
      toast.error("Failed to update test");
    }
  }

  async function addStep(type: string) {
    const config = getDefaultConfig(type);
    const description = getDefaultDescription(type);

    // Create step in database immediately
    try {
      const res = await fetch(`/api/tests/${testId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description, config }),
      });

      if (res.ok) {
        const newStep = await res.json();
        const updatedSteps = [...steps, newStep];
        setSteps(updatedSteps);
        setSelectedStep(newStep);
        toast.success("Step added");
      } else {
        toast.error("Failed to add step");
      }
    } catch (error) {
      toast.error("Failed to add step");
    }
    setShowStepPalette(false);
  }

  function getDefaultDescription(type: string): string {
    const descriptions: Record<string, string> = {
      NAVIGATE: "Navigate to URL",
      CLICK: "Click on element",
      TYPE: "Type text into input",
      WAIT: "Wait for condition",
      WAIT_FOR_URL: "Wait for URL to change",
      ASSERT_TEXT: "Assert text is present",
      ASSERT_ELEMENT: "Assert element exists",
      ASSERT_VISUAL: "Assert visual match",
      AI_CHECK: "AI: Verify condition",
      AI_EXTRACT: "AI: Extract information",
      AI_ACTION: "AI: Perform action",
      SCREENSHOT: "Take screenshot",
      HOVER: "Hover over element",
      SELECT: "Select option",
      PRESS_KEY: "Press keyboard key",
      SCROLL: "Scroll page",
      JAVASCRIPT: "Execute JavaScript",
    };
    return descriptions[type] || "New step";
  }

  function getDefaultConfig(type: string): Record<string, unknown> {
    const configs: Record<string, Record<string, unknown>> = {
      NAVIGATE: { url: project?.baseUrl || "" },
      CLICK: { target: "", useAI: true },
      TYPE: { target: "", value: "", useAI: true },
      WAIT: { duration: 1000 },
      WAIT_FOR_URL: { url: "" },
      ASSERT_TEXT: { text: "", selector: "" },
      ASSERT_ELEMENT: { selector: "", useAI: true },
      ASSERT_VISUAL: { threshold: 0.8, fullPage: false },
      AI_CHECK: { assertion: "", useVision: false },
      AI_EXTRACT: { query: "", schema: {} },
      AI_ACTION: { instruction: "" },
      SCREENSHOT: { fullPage: false },
      HOVER: { target: "", useAI: true },
      SELECT: { target: "", value: "", useAI: true },
      PRESS_KEY: { key: "Enter" },
      SCROLL: { direction: "down", amount: 300 },
      JAVASCRIPT: { code: "// JavaScript code\n" },
    };
    return configs[type] || {};
  }

  async function updateStep(id: string, updates: Partial<Step>) {
    // Update local state immediately for UI responsiveness
    const updatedSteps = steps.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    );
    setSteps(updatedSteps);

    if (selectedStep?.id === id) {
      setSelectedStep({ ...selectedStep, ...updates });
    }

    // Auto-save to database
    const stepToUpdate = updatedSteps.find((s) => s.id === id);
    if (stepToUpdate) {
      try {
        const res = await fetch(`/api/tests/${testId}/steps`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              id: stepToUpdate.id,
              orderIndex: stepToUpdate.orderIndex,
              type: stepToUpdate.type,
              description: stepToUpdate.description,
              config: stepToUpdate.config,
            },
          ]),
        });

        if (!res.ok) {
          console.error("Failed to auto-save step");
        }
      } catch (error) {
        console.error("Error auto-saving step:", error);
      }
    }
  }

  async function deleteStep(id: string) {
    try {
      const res = await fetch(`/api/tests/${testId}/steps?stepId=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSteps(
          steps
            .filter((s) => s.id !== id)
            .map((s, i) => ({ ...s, orderIndex: i })),
        );
        if (selectedStep?.id === id) {
          setSelectedStep(null);
        }
        toast.success("Step deleted");
      } else {
        toast.error("Failed to delete step");
      }
    } catch (error) {
      toast.error("Failed to delete step");
    }
  }

  async function moveStepUp(index: number) {
    if (index === 0) return;
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [
      newSteps[index],
      newSteps[index - 1],
    ];
    const reorderedSteps = newSteps.map((s, i) => ({ ...s, orderIndex: i }));
    setSteps(reorderedSteps);

    // Save new order to database
    try {
      const res = await fetch(`/api/tests/${testId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reorderedSteps.map((s) => ({
            id: s.id,
            orderIndex: s.orderIndex,
            type: s.type,
            description: s.description,
            config: s.config,
          })),
        ),
      });

      if (res.ok) {
        const savedSteps = await res.json();
        setSteps(savedSteps);
      }
    } catch {
      // Silent fail - UI already updated
    }
  }

  async function moveStepDown(index: number) {
    if (index >= steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [
      newSteps[index + 1],
      newSteps[index],
    ];
    const reorderedSteps = newSteps.map((s, i) => ({ ...s, orderIndex: i }));
    setSteps(reorderedSteps);

    // Save new order to database
    try {
      const res = await fetch(`/api/tests/${testId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reorderedSteps.map((s) => ({
            id: s.id,
            orderIndex: s.orderIndex,
            type: s.type,
            description: s.description,
            config: s.config,
          })),
        ),
      });

      if (res.ok) {
        const savedSteps = await res.json();
        setSteps(savedSteps);
      }
    } catch {
      // Silent fail - UI already updated
    }
  }

  function getStepIcon(type: string) {
    const stepType = STEP_TYPES.find((s) => s.type === type);
    const Icon = stepType?.icon || Code;
    return Icon;
  }

  function getStepColor(type: string): string {
    if (type.startsWith("AI_"))
      return "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_rgba(var(--primary),0.1)]";
    if (type.includes("ASSERT"))
      return "bg-green-500/10 text-green-600 border-green-500/20";
    if (type === "NAVIGATE")
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (type === "CLICK" || type === "TYPE")
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    return "bg-muted text-muted-foreground border-border/50";
  }

  function getHealthColor(passRate: number | null): string {
    if (passRate === null) return "text-gray-400";
    if (passRate >= 90) return "text-green-600";
    if (passRate >= 70) return "text-yellow-600";
    return "text-red-600";
  }

  function getFlakinessColor(flakiness: number | null): string {
    if (flakiness === null) return "text-gray-400";
    if (flakiness === 0) return "text-green-600";
    if (flakiness <= 30) return "text-yellow-600";
    return "text-red-600";
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  }

  function HealthStats() {
    if (!test || !test.health || test.health.totalRuns === 0) {
      return (
        <div className="px-4 mb-10">
          <Card className="bg-card/40 border-dashed border-2 rounded-[2rem] shadow-none flex items-center justify-center py-10">
            <div className="flex items-center gap-4 text-muted-foreground">
              <Activity className="h-5 w-5 opacity-40" />
              <p className="font-medium text-lg text-muted-foreground/60">
                No runs yet. Execute this test to see health metrics.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    const { health } = test;

    return (
      <div className="px-4 mb-10">
        <Card className="rounded-[2.5rem] overflow-hidden border-border/40 shadow-elegant bg-card/40 backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/30">
            {/* Pass Rate */}
            <div className="p-8 space-y-3 hover:bg-primary/[0.02] transition-colors duration-500">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <CheckCircle className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  Pass Rate
                </p>
              </div>
              <div
                className={`text-5xl font-display font-normal tracking-tight ${getHealthColor(health.passRate)}`}
              >
                {health.passRate !== null ? `${health.passRate}%` : "N/A"}
              </div>
              <p className="text-sm font-medium text-muted-foreground/60">
                {health.passedRuns} passed of {health.totalRuns} total
              </p>
            </div>

            {/* Flakiness */}
            <div className="p-8 space-y-3 hover:bg-primary/[0.02] transition-colors duration-500">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <AlertCircle className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  Stability
                </p>
              </div>
              <div
                className={`text-5xl font-display font-normal tracking-tight ${getFlakinessColor(health.flakiness)}`}
              >
                {health.flakiness !== null
                  ? `${100 - health.flakiness}%`
                  : "N/A"}
              </div>
              <p className="text-sm font-medium text-muted-foreground/60">
                {health.flakiness === 0
                  ? "Highly resilient"
                  : health.flakiness && health.flakiness > 30
                    ? "Significant variance"
                    : "Minor variance"}
              </p>
            </div>

            {/* Recent History */}
            <div className="p-8 space-y-4 hover:bg-primary/[0.02] transition-colors duration-500">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <History className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  Runs History
                </p>
              </div>
              <div className="flex items-center gap-1.5 h-10">
                {[...test.runs]
                  .slice(0, 10)
                  .reverse()
                  .map((run, i, arr) => {
                    const runIndex = test.runs.length - (arr.length - 1 - i);
                    return (
                      <Tooltip key={run.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-full w-2 rounded-full transition-all duration-500 ring-4 ring-transparent hover:ring-primary/10 hover:scale-y-110 cursor-help ${
                              run.status === "PASSED"
                                ? "bg-green-500/80 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                                : run.status === "FAILED" ||
                                    run.status === "ERROR"
                                  ? "bg-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                                  : "bg-muted shadow-inner"
                            }`}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="bg-slate-900 text-white border-none px-3 py-1.5 rounded-lg shadow-xl translate-y-1"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-0.5">
                            Run #{runIndex}
                          </div>
                          <div className="text-xs font-bold">{run.status}</div>
                          {run.createdAt && (
                            <div className="text-[9px] opacity-40 mt-1">
                              {new Date(run.createdAt).toLocaleDateString()}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
              </div>
              <p className="text-sm font-medium text-muted-foreground/60">
                Performance over last 10 runs
              </p>
            </div>

            {/* Performance Stats */}
            <div className="p-8 space-y-3 hover:bg-primary/[0.02] transition-colors duration-500">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <TrendingUp className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                  Velocity
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/5">
                  {getTrendIcon(health.trend)}
                </div>
                <span className="text-4xl font-display font-normal tracking-tight capitalize text-foreground/80">
                  {health.trend}
                </span>
              </div>
              <p className="text-sm font-medium text-muted-foreground/60">
                Efficiency is currently {health.trend}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!test) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Test not found</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex items-center gap-6 mb-10 px-4">
        <Link href={`/projects/${projectId}/tests`}>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-2xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {editingName ? (
              <Input
                defaultValue={test.name}
                onBlur={(e) => {
                  handleUpdateTest(e.target.value);
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateTest(e.currentTarget.value);
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="text-4xl font-display font-bold tracking-tight h-auto py-1 max-w-2xl bg-transparent border-none focus-visible:ring-0 px-0"
              />
            ) : (
              <h1
                className="text-4xl font-display font-bold tracking-tight cursor-text hover:text-primary transition-colors group flex items-center gap-2"
                onClick={() => setEditingName(true)}
              >
                {test.name}
                <Settings className="h-5 w-5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all duration-300" />
              </h1>
            )}
            <Badge
              variant="outline"
              className="rounded-lg bg-primary/5 text-primary border-primary/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
            >
              {test.status}
            </Badge>
            <Link href={`/projects/${projectId}/tests/${testId}/runs`}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-7 px-3 font-bold border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300"
              >
                <History className="mr-1.5 h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">
                  Reports
                </span>
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> {steps.length} steps
            </span>
            <span className="text-muted-foreground/30">•</span>
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              {project?.name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="rounded-2xl h-12 px-6 font-bold border-border/40 hover:bg-primary/5 transition-all duration-300"
            onClick={handleSaveSteps}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            Save
          </Button>

          <div className="flex items-center h-12 rounded-2xl border border-border/40 bg-background/50 overflow-hidden shadow-sm">
            {environments.length > 0 && (
              <>
                <Select
                  value={selectedEnvironmentId}
                  onValueChange={setSelectedEnvironmentId}
                >
                  <SelectTrigger className="h-full border-none rounded-none px-4 bg-transparent focus:ring-0 w-[140px] text-xs font-bold uppercase tracking-wider">
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
                    <SelectItem
                      value="none"
                      className="text-xs font-bold uppercase tracking-wider"
                    >
                      Default
                    </SelectItem>
                    {environments.map((env) => (
                      <SelectItem
                        key={env.id}
                        value={env.id}
                        className="text-xs font-bold uppercase tracking-wider"
                      >
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Separator
                  orientation="vertical"
                  className="h-6 bg-border/20"
                />
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  className="h-full border-none rounded-none px-8 font-bold shadow-none hover:bg-primary/90 transition-all duration-300"
                  onClick={handleRunTest}
                  disabled={running || steps.length === 0}
                >
                  {running ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="mr-3 h-5 w-5 fill-current" />
                  )}
                  Run
                </Button>
              </TooltipTrigger>
              {steps.length === 0 && (
                <TooltipContent className="rounded-xl p-3 shadow-xl">
                  Add test steps before running
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 mb-8">
        {editingDescription ? (
          <Textarea
            defaultValue={test.description || ""}
            onBlur={(e) => {
              handleUpdateTest(undefined, e.target.value);
              setEditingDescription(false);
            }}
            placeholder="Add a detailed description for this automated flow..."
            className="rounded-2xl border-border/40 bg-card/40 p-6 text-lg min-h-[100px] shadow-inner"
            autoFocus
          />
        ) : (
          <p
            className="text-xl font-medium text-muted-foreground leading-relaxed cursor-pointer hover:text-foreground transition-all duration-300 group max-w-4xl"
            onClick={() => setEditingDescription(true)}
          >
            {test.description ||
              "Click to add a description of what this test verifies..."}
            <Save className="inline-block ml-3 h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
          </p>
        )}
      </div>

      {/* Health Stats */}
      <HealthStats />

      {/* Main Editor Layout */}
      <div className="grid gap-8 lg:grid-cols-[320px_1fr_420px] px-4 h-[calc(100vh-420px)] min-h-[600px]">
        {/* Step Palette */}
        <Card className="flex flex-col border-border/40 bg-card/40 backdrop-blur-xl rounded-[2rem] shadow-elegant overflow-hidden">
          <CardHeader className="pb-4 shrink-0 px-6 pt-6">
            <div className="flex items-center gap-2 text-primary">
              <Plus className="h-4 w-4" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">
                Step Palette
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-6">
                {[
                  "Basic",
                  "Interaction",
                  "Timing",
                  "Assertion",
                  "AI",
                  "Debug",
                  "Advanced",
                ].map((category) => (
                  <div key={category} className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] px-2 mb-3">
                      {category}
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {STEP_TYPES.filter((s) => s.category === category).map(
                        (stepType) => (
                          <Button
                            key={stepType.type}
                            variant="ghost"
                            className="w-full justify-start gap-3 h-11 px-3 rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-300 group border border-transparent hover:border-primary/10"
                            onClick={() => addStep(stepType.type)}
                          >
                            <div className="p-1.5 rounded-lg bg-primary/5 group-hover:bg-primary text-primary group-hover:text-primary-foreground transition-all duration-300">
                              <stepType.icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-semibold">
                              {stepType.label}
                            </span>
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Steps List */}
        <Card className="flex flex-col border-border/40 bg-card/40 backdrop-blur-xl rounded-[2rem] shadow-elegant overflow-hidden">
          <CardHeader className="pb-4 shrink-0 px-6 pt-6">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Activity className="h-4 w-4" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">
                Test Steps ({steps.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-6">
                {steps.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground bg-primary/[0.02] rounded-[1.5rem] border border-dashed border-border/40">
                    <Sparkles className="h-8 w-8 mx-auto mb-4 opacity-20" />
                    <p className="font-semibold text-lg">No steps yet</p>
                    <p className="text-sm opacity-60">
                      Add some interactions from the palette
                    </p>
                  </div>
                ) : (
                  steps.map((step, index) => {
                    const Icon = getStepIcon(step.type);
                    const isSelected = selectedStep?.id === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`group flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? "border-primary bg-primary/[0.03] shadow-[0_20px_50px_-12px_rgba(var(--primary),0.12)] ring-1 ring-primary/20 scale-[1.01]"
                            : "border-border/40 hover:border-primary/30 hover:bg-primary/[0.01]"
                        }`}
                        onClick={() => setSelectedStep(step)}
                      >
                        <div className="flex flex-col items-center justify-center shrink-0 min-w-[32px] gap-0.5 relative group/controls select-none">
                          <button
                            className={`p-1 rounded-md transition-all duration-300 ${
                              index === 0
                                ? "opacity-0 pointer-events-none"
                                : "opacity-0 group-hover/controls:opacity-100 hover:bg-primary hover:text-white text-muted-foreground/30"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStepUp(index);
                            }}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>

                          <span className="text-[10px] text-muted-foreground/30 font-black tabular-nums tracking-widest leading-none py-1">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <button
                            className={`p-1 rounded-md transition-all duration-300 ${
                              index === steps.length - 1
                                ? "opacity-0 pointer-events-none"
                                : "opacity-0 group-hover/controls:opacity-100 hover:bg-primary hover:text-white text-muted-foreground/30"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStepDown(index);
                            }}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0 flex items-center gap-4">
                          <div
                            className={`p-3 rounded-2xl border transition-all duration-500 ${
                              isSelected
                                ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary"
                                : "bg-background border-border/40 text-muted-foreground/60 group-hover:border-primary/20 group-hover:bg-primary/5"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold font-sans uppercase tracking-[0.2em] ${isSelected ? "text-primary" : "text-muted-foreground/40"}`}
                              >
                                {step.type}
                              </span>
                            </div>
                            <p
                              className={`text-base font-bold font-sans transition-colors duration-300 ${isSelected ? "text-foreground" : "text-foreground/80"}`}
                            >
                              {step.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteStep(step.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Step Configuration */}
        <Card className="flex flex-col border-border/40 bg-card/40 backdrop-blur-xl rounded-[2rem] shadow-elegant overflow-hidden">
          <CardHeader className="pb-4 shrink-0 px-6 pt-6">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Settings className="h-4 w-4" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">
                {selectedStep ? "Configuration" : "Selection Required"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {selectedStep ? (
              <div className="p-8">
                <StepConfigForm
                  step={selectedStep}
                  onChange={(updates) => updateStep(selectedStep.id, updates)}
                  projectBaseUrl={project?.baseUrl || ""}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                <div className="p-4 rounded-3xl bg-primary/5 text-primary/20">
                  <ArrowRight className="h-10 w-10 rotate-180" />
                </div>
                <div>
                  <p className="font-bold text-lg text-muted-foreground/60">
                    No Step Selected
                  </p>
                  <p className="text-sm text-muted-foreground/40">
                    Choose a step from the list to adjust its properties
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

// Step Configuration Form Component
function StepConfigForm({
  step,
  onChange,
  projectBaseUrl,
}: {
  step: Step;
  onChange: (updates: Partial<Step>) => void;
  projectBaseUrl: string;
}) {
  const updateConfig = (key: string, value: unknown) => {
    onChange({
      config: { ...step.config, [key]: value },
    });
  };

  const updateDescription = (value: string) => {
    onChange({ description: value });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
          Step Description
        </Label>
        <Textarea
          value={step.description}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="What exactly does this step do?"
          rows={2}
          className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20 transition-all duration-300 min-h-[80px] shadow-sm"
        />
      </div>

      <div className="relative py-2">
        <Separator className="bg-border/20" />
      </div>

      {/* Step-specific configuration */}
      {step.type === "NAVIGATE" && (
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
            Destination URL
          </Label>
          <Input
            value={(step.config.url as string) || ""}
            onChange={(e) => updateConfig("url", e.target.value)}
            placeholder={projectBaseUrl || "https://app.hound.ai"}
            className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20"
          />
        </div>
      )}

      {(step.type === "CLICK" || step.type === "HOVER") && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                Target Element
              </Label>
              <div
                className="flex items-center gap-2 group cursor-pointer"
                onClick={() =>
                  updateConfig("useAI", !(step.config.useAI ?? true))
                }
              >
                <div
                  className={`w-4 h-4 rounded-md border transition-all duration-300 flex items-center justify-center ${
                    (step.config.useAI ?? true)
                      ? "bg-primary border-primary shadow-sm"
                      : "border-border/60 bg-background group-hover:border-primary/40"
                  }`}
                >
                  {(step.config.useAI ?? true) && (
                    <motion.svg
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-2.5 h-2.5 text-white"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  )}
                </div>
                <span className="text-xs font-bold text-muted-foreground/60 select-none">
                  AI Smart Target
                </span>
              </div>
            </div>
            <Textarea
              value={(step.config.target as string) || ""}
              onChange={(e) => updateConfig("target", e.target.value)}
              placeholder={
                step.config.useAI
                  ? "e.g., the 'Login' button in the navbar"
                  : "CSS selector (e.g., #login-btn)"
              }
              rows={3}
              className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20 min-h-[100px]"
            />
          </div>
        </div>
      )}

      {step.type === "TYPE" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                Target Input
              </Label>
              <div
                className="flex items-center gap-2 group cursor-pointer"
                onClick={() =>
                  updateConfig("useAI", !(step.config.useAI ?? true))
                }
              >
                <div
                  className={`w-4 h-4 rounded-md border transition-all duration-300 flex items-center justify-center ${
                    (step.config.useAI ?? true)
                      ? "bg-primary border-primary shadow-sm"
                      : "border-border/60 bg-background group-hover:border-primary/40"
                  }`}
                >
                  {(step.config.useAI ?? true) && (
                    <motion.svg
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-2.5 h-2.5 text-white"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  )}
                </div>
                <span className="text-xs font-bold text-muted-foreground/60 select-none">
                  AI Smart Target
                </span>
              </div>
            </div>
            <Textarea
              value={(step.config.target as string) || ""}
              onChange={(e) => updateConfig("target", e.target.value)}
              placeholder={
                step.config.useAI
                  ? "e.g., the email field on the signup page"
                  : "CSS selector"
              }
              rows={2}
              className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Input Value
            </Label>
            <Input
              value={(step.config.value as string) || ""}
              onChange={(e) => updateConfig("value", e.target.value)}
              placeholder="What should be typed?"
              className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20"
            />
          </div>
        </div>
      )}

      {step.type === "WAIT" && (
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
            Delay Duration (ms)
          </Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={(step.config.duration as number) || 1000}
              onChange={(e) =>
                updateConfig("duration", parseInt(e.target.value))
              }
              className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20 flex-1"
            />
            <div className="px-4 py-3 rounded-xl bg-orange-500/10 text-orange-600 font-bold text-xs uppercase tracking-widest">
              Milliseconds
            </div>
          </div>
        </div>
      )}

      {step.type === "WAIT_FOR_URL" && (
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
            Test URL Pattern
          </Label>
          <Input
            value={(step.config.url as string) || ""}
            onChange={(e) => updateConfig("url", e.target.value)}
            placeholder="/dashboard or /^https:\/\/app\.hound\.ai\/.*$/"
            className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20 font-mono text-sm"
          />
        </div>
      )}

      {step.type === "ASSERT_TEXT" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Expected Text
            </Label>
            <Input
              value={(step.config.text as string) || ""}
              onChange={(e) => updateConfig("text", e.target.value)}
              placeholder="The exact text you want to find"
              className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Container (Optional)
            </Label>
            <Input
              value={(step.config.selector as string) || ""}
              onChange={(e) => updateConfig("selector", e.target.value)}
              placeholder="e.g., .product-title or #main-content"
              className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20 font-mono text-xs"
            />
          </div>
        </div>
      )}

      {step.type === "ASSERT_ELEMENT" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Target Element</Label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`useAI-${step.id}`}
                checked={(step.config.useAI as boolean) ?? true}
                onChange={(e) => updateConfig("useAI", e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label
                htmlFor={`useAI-${step.id}`}
                className="text-sm font-normal"
              >
                Use AI targeting
              </Label>
            </div>
          </div>
          <Textarea
            value={(step.config.selector as string) || ""}
            onChange={(e) => updateConfig("selector", e.target.value)}
            placeholder={
              step.config.useAI ? "e.g., the submit button" : "CSS selector"
            }
            rows={2}
          />
        </div>
      )}

      {step.type === "ASSERT_VISUAL" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Matching Sensitivity
            </Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={(step.config.threshold as number) ?? 0.8}
                onChange={(e) =>
                  updateConfig("threshold", parseFloat(e.target.value))
                }
                className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20 w-32"
              />
              <div className="flex-1 text-xs text-muted-foreground/60 leading-tight">
                Higher values are more strict. 1.0 requires a pixel-perfect
                match.
              </div>
            </div>
          </div>
          <div
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() =>
              updateConfig("fullPage", !(step.config.fullPage ?? false))
            }
          >
            <div
              className={`w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center ${(step.config.fullPage ?? false) ? "bg-primary border-primary" : "border-border/60"}`}
            >
              {(step.config.fullPage ?? false) && (
                <CheckCircle className="h-2.5 w-2.5 text-white" />
              )}
            </div>
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">
              Capture Full Height
            </span>
          </div>
        </div>
      )}

      {step.type === "AI_CHECK" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Validation Instruction
            </Label>
            <Textarea
              value={(step.config.assertion as string) || ""}
              onChange={(e) => updateConfig("assertion", e.target.value)}
              placeholder="e.g., Verify that the price in the cart ($49) matches the product list price"
              rows={3}
              className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20 min-h-[120px]"
            />
          </div>
          <div
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() =>
              updateConfig("useVision", !(step.config.useVision ?? false))
            }
          >
            <div
              className={`w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center ${(step.config.useVision ?? false) ? "bg-primary border-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "border-border/60"}`}
            >
              {(step.config.useVision ?? false) && (
                <Sparkles className="h-2.5 w-2.5 text-white" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Vision-First Execution
              </span>
              <span className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                Enhanced Accuracy
              </span>
            </div>
          </div>
        </div>
      )}

      {step.type === "AI_EXTRACT" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Data to Harvest
            </Label>
            <Textarea
              value={(step.config.query as string) || ""}
              onChange={(e) => updateConfig("query", e.target.value)}
              placeholder="e.g., Find the order confirmation number and the estimated delivery date"
              rows={2}
              className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Schema Blueprint (JSON)
            </Label>
            <div className="relative group">
              <Textarea
                value={JSON.stringify(step.config.schema || {}, null, 2)}
                onChange={(e) => {
                  try {
                    updateConfig("schema", JSON.parse(e.target.value));
                  } catch {
                    // Ignore invalid JSON
                  }
                }}
                placeholder='{ "orderId": "string", "date": "string" }'
                rows={4}
                className="rounded-2xl border-border/40 bg-background/50 p-4 font-mono text-xs focus-visible:ring-primary/20"
              />
              <Code className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
            </div>
          </div>
        </div>
      )}

      {step.type === "AI_ACTION" && (
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
            Behavioral Instruction
          </Label>
          <Textarea
            value={(step.config.instruction as string) || ""}
            onChange={(e) => updateConfig("instruction", e.target.value)}
            placeholder="e.g., Navigate through the multi-step checkout and stop at the final confirmation page"
            rows={3}
            className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20 min-h-[120px]"
          />
        </div>
      )}

      {step.type === "PRESS_KEY" && (
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
            Keyboard Input
          </Label>
          <Select
            value={(step.config.key as string) || "Enter"}
            onValueChange={(value) => updateConfig("key", value)}
          >
            <SelectTrigger className="rounded-xl border-border/40 bg-background/50 h-12 focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
              <SelectItem value="Enter">Enter ↵</SelectItem>
              <SelectItem value="Escape">Escape ⎋</SelectItem>
              <SelectItem value="Tab">Tab ⇥</SelectItem>
              <SelectItem value="ArrowUp">Arrow Up ↑</SelectItem>
              <SelectItem value="ArrowDown">Arrow Down ↓</SelectItem>
              <SelectItem value="ArrowLeft">Arrow Left ←</SelectItem>
              <SelectItem value="ArrowRight">Arrow Right →</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {step.type === "SCROLL" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Direction
            </Label>
            <Select
              value={(step.config.direction as string) || "down"}
              onValueChange={(value) => updateConfig("direction", value)}
            >
              <SelectTrigger className="rounded-xl border-border/40 bg-background/50 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
                <SelectItem value="up">Scroll Up</SelectItem>
                <SelectItem value="down">Scroll Down</SelectItem>
                <SelectItem value="left">Scroll Left</SelectItem>
                <SelectItem value="right">Scroll Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              Pixel Distance
            </Label>
            <Input
              type="number"
              value={(step.config.amount as number) || 300}
              onChange={(e) => updateConfig("amount", parseInt(e.target.value))}
              className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20"
            />
          </div>
        </div>
      )}

      {step.type === "JAVASCRIPT" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              Custom Payload
            </Label>
            <Code className="h-3.5 w-3.5 text-primary/40" />
          </div>
          <Textarea
            value={(step.config.code as string) || ""}
            onChange={(e) => updateConfig("code", e.target.value)}
            placeholder="// Example: return window.localStorage.getItem('token');"
            rows={10}
            className="rounded-2xl border-border/40 bg-background/50 p-4 font-mono text-xs focus-visible:ring-primary/20 min-h-[200px]"
          />
        </div>
      )}

      {step.type === "SCREENSHOT" && (
        <div
          className="flex items-center gap-3 group cursor-pointer"
          onClick={() =>
            updateConfig("fullPage", !(step.config.fullPage ?? false))
          }
        >
          <div
            className={`w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center ${(step.config.fullPage ?? false) ? "bg-primary border-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "border-border/60"}`}
          >
            {(step.config.fullPage ?? false) && (
              <Camera className="h-2.5 w-2.5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              Capture Full Surface
            </span>
            <span className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
              High-Definition rendering
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
