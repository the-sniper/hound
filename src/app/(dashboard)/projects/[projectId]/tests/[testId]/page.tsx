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
} from "lucide-react";
import { toast } from "sonner";

// Step type definitions
const STEP_TYPES = [
  { type: "NAVIGATE", label: "Navigate", icon: ArrowRight, category: "Basic" },
  { type: "CLICK", label: "Click", icon: MousePointerClick, category: "Interaction" },
  { type: "TYPE", label: "Type", icon: Keyboard, category: "Interaction" },
  { type: "WAIT", label: "Wait", icon: Clock, category: "Timing" },
  { type: "WAIT_FOR_URL", label: "Wait for URL", icon: Clock, category: "Timing" },
  { type: "ASSERT_TEXT", label: "Assert Text", icon: CheckCircle, category: "Assertion" },
  { type: "ASSERT_ELEMENT", label: "Assert Element", icon: Eye, category: "Assertion" },
  { type: "AI_CHECK", label: "AI Check", icon: Sparkles, category: "AI" },
  { type: "AI_EXTRACT", label: "AI Extract", icon: Sparkles, category: "AI" },
  { type: "AI_ACTION", label: "AI Action", icon: Sparkles, category: "AI" },
  { type: "SCREENSHOT", label: "Screenshot", icon: Camera, category: "Debug" },
  { type: "HOVER", label: "Hover", icon: MousePointerClick, category: "Interaction" },
  { type: "SELECT", label: "Select", icon: MousePointerClick, category: "Interaction" },
  { type: "PRESS_KEY", label: "Press Key", icon: Keyboard, category: "Interaction" },
  { type: "SCROLL", label: "Scroll", icon: MousePointerClick, category: "Interaction" },
  { type: "JAVASCRIPT", label: "JavaScript", icon: Code, category: "Advanced" },
];

interface Step {
  id: string;
  orderIndex: number;
  type: string;
  description: string;
  config: Record<string, unknown>;
}

interface Test {
  id: string;
  name: string;
  description: string | null;
  status: string;
  projectId: string;
  steps: Step[];
}

interface Project {
  id: string;
  name: string;
  baseUrl: string;
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
      }
      if (projectRes.ok) {
        setProject(await projectRes.json());
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
      const res = await fetch(`/api/tests/${testId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(steps),
      });

      if (res.ok) {
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
        body: JSON.stringify({ testId }),
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

  function addStep(type: string) {
    const newStep: Step = {
      id: `temp-${Date.now()}`,
      orderIndex: steps.length,
      type,
      description: getDefaultDescription(type),
      config: getDefaultConfig(type),
    };
    setSteps([...steps, newStep]);
    setSelectedStep(newStep);
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

  function updateStep(id: string, updates: Partial<Step>) {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    if (selectedStep?.id === id) {
      setSelectedStep({ ...selectedStep, ...updates });
    }
  }

  function deleteStep(id: string) {
    setSteps(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, orderIndex: i })));
    if (selectedStep?.id === id) {
      setSelectedStep(null);
    }
  }

  function moveStepUp(index: number) {
    if (index === 0) return;
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps.map((s, i) => ({ ...s, orderIndex: i })));
  }

  function moveStepDown(index: number) {
    if (index >= steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, orderIndex: i })));
  }

  function getStepIcon(type: string) {
    const stepType = STEP_TYPES.find((s) => s.type === type);
    const Icon = stepType?.icon || Code;
    return Icon;
  }

  function getStepColor(type: string): string {
    if (type.startsWith("AI_")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (type.includes("ASSERT")) return "bg-green-100 text-green-800 border-green-200";
    if (type === "NAVIGATE") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
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
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/projects/${projectId}/tests`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
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
              className="text-2xl font-bold h-auto py-1"
            />
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:text-primary"
              onClick={() => setEditingName(true)}
            >
              {test.name}
            </h1>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Badge variant="outline">{test.status}</Badge>
            <span>•</span>
            <span>{steps.length} steps</span>
            <span>•</span>
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-foreground"
            >
              {project?.name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSaveSteps}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          <Button onClick={handleRunTest} disabled={running || steps.length === 0}>
            {running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Test
          </Button>
        </div>
      </div>

      {/* Description */}
      {editingDescription ? (
        <Textarea
          defaultValue={test.description || ""}
          onBlur={(e) => {
            handleUpdateTest(undefined, e.target.value);
            setEditingDescription(false);
          }}
          placeholder="Add a description for this test..."
          className="mb-4"
          autoFocus
        />
      ) : (
        <p
          className="text-muted-foreground mb-6 cursor-pointer hover:text-foreground"
          onClick={() => setEditingDescription(true)}
        >
          {test.description || "Click to add description..."}
        </p>
      )}

      {/* Main Editor Layout */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr_400px]">
        {/* Step Palette */}
        <Card className="h-[calc(100vh-300px)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Step Palette</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="space-y-1 p-4">
                {["Basic", "Interaction", "Timing", "Assertion", "AI", "Debug", "Advanced"].map(
                  (category) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                        {category}
                      </p>
                      {STEP_TYPES.filter((s) => s.category === category).map((stepType) => (
                        <Button
                          key={stepType.type}
                          variant="ghost"
                          className="w-full justify-start gap-2 h-auto py-2"
                          onClick={() => addStep(stepType.type)}
                        >
                          <stepType.icon className="h-4 w-4" />
                          <span className="text-sm">{stepType.label}</span>
                        </Button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Steps List */}
        <Card className="h-[calc(100vh-300px)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Test Steps ({steps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="space-y-2 p-4">
                {steps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No steps yet</p>
                    <p className="text-sm">Click a step type from the palette to add one</p>
                  </div>
                ) : (
                  steps.map((step, index) => {
                    const Icon = getStepIcon(step.type);
                    const isSelected = selectedStep?.id === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`group flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedStep(step)}
                      >
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveStepUp(index);
                                }}
                                disabled={index === 0}
                              >
                                <ChevronLeft className="h-3 w-3 -rotate-90" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move up</TooltipContent>
                          </Tooltip>
                          <span className="text-xs text-muted-foreground font-medium">
                            {index + 1}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveStepDown(index);
                                }}
                                disabled={index >= steps.length - 1}
                              >
                                <ChevronLeft className="h-3 w-3 rotate-90" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move down</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getStepColor(step.type)} text-xs`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {step.type}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {step.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Step Configuration */}
        <Card className="h-[calc(100vh-300px)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {selectedStep ? "Step Configuration" : "Select a Step"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStep ? (
              <StepConfigForm
                step={selectedStep}
                onChange={(updates) => updateStep(selectedStep.id, updates)}
                projectBaseUrl={project?.baseUrl || ""}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Select a step to configure it</p>
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={step.description}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="Describe what this step does..."
          rows={2}
        />
      </div>

      <Separator />

      {/* Step-specific configuration */}
      {step.type === "NAVIGATE" && (
        <div className="space-y-2">
          <Label>URL</Label>
          <Input
            value={(step.config.url as string) || ""}
            onChange={(e) => updateConfig("url", e.target.value)}
            placeholder={projectBaseUrl || "https://example.com"}
          />
        </div>
      )}

      {(step.type === "CLICK" || step.type === "HOVER") && (
        <>
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
                <Label htmlFor={`useAI-${step.id}`} className="text-sm font-normal">
                  Use AI targeting
                </Label>
              </div>
            </div>
            <Textarea
              value={(step.config.target as string) || ""}
              onChange={(e) => updateConfig("target", e.target.value)}
              placeholder={step.config.useAI ? "e.g., the 'Add to Cart' button" : "CSS selector"}
              rows={2}
            />
          </div>
        </>
      )}

      {step.type === "TYPE" && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Target Input</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`useAI-${step.id}`}
                  checked={(step.config.useAI as boolean) ?? true}
                  onChange={(e) => updateConfig("useAI", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor={`useAI-${step.id}`} className="text-sm font-normal">
                  Use AI targeting
                </Label>
              </div>
            </div>
            <Textarea
              value={(step.config.target as string) || ""}
              onChange={(e) => updateConfig("target", e.target.value)}
              placeholder={step.config.useAI ? "e.g., the email input field" : "CSS selector"}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Value to Type</Label>
            <Input
              value={(step.config.value as string) || ""}
              onChange={(e) => updateConfig("value", e.target.value)}
              placeholder="Text to type..."
            />
          </div>
        </>
      )}

      {step.type === "WAIT" && (
        <div className="space-y-2">
          <Label>Duration (ms)</Label>
          <Input
            type="number"
            value={(step.config.duration as number) || 1000}
            onChange={(e) => updateConfig("duration", parseInt(e.target.value))}
          />
        </div>
      )}

      {step.type === "WAIT_FOR_URL" && (
        <div className="space-y-2">
          <Label>Expected URL Pattern</Label>
          <Input
            value={(step.config.url as string) || ""}
            onChange={(e) => updateConfig("url", e.target.value)}
            placeholder="/checkout or https://example.com/checkout"
          />
        </div>
      )}

      {step.type === "ASSERT_TEXT" && (
        <>
          <div className="space-y-2">
            <Label>Text to Assert</Label>
            <Input
              value={(step.config.text as string) || ""}
              onChange={(e) => updateConfig("text", e.target.value)}
              placeholder="Expected text content"
            />
          </div>
          <div className="space-y-2">
            <Label>Optional: Container Selector</Label>
            <Input
              value={(step.config.selector as string) || ""}
              onChange={(e) => updateConfig("selector", e.target.value)}
              placeholder="CSS selector (optional)"
            />
          </div>
        </>
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
              <Label htmlFor={`useAI-${step.id}`} className="text-sm font-normal">
                Use AI targeting
              </Label>
            </div>
          </div>
          <Textarea
            value={(step.config.selector as string) || ""}
            onChange={(e) => updateConfig("selector", e.target.value)}
            placeholder={step.config.useAI ? "e.g., the submit button" : "CSS selector"}
            rows={2}
          />
        </div>
      )}

      {step.type === "AI_CHECK" && (
        <>
          <div className="space-y-2">
            <Label>Assertion (Natural Language)</Label>
            <Textarea
              value={(step.config.assertion as string) || ""}
              onChange={(e) => updateConfig("assertion", e.target.value)}
              placeholder="e.g., The cart shows 3 items and the total is $45.00"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`useVision-${step.id}`}
              checked={(step.config.useVision as boolean) ?? false}
              onChange={(e) => updateConfig("useVision", e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor={`useVision-${step.id}`} className="text-sm font-normal">
              Use vision mode (slower but more accurate)
            </Label>
          </div>
        </>
      )}

      {step.type === "AI_EXTRACT" && (
        <>
          <div className="space-y-2">
            <Label>What to Extract</Label>
            <Textarea
              value={(step.config.query as string) || ""}
              onChange={(e) => updateConfig("query", e.target.value)}
              placeholder="e.g., Extract all product names and prices from the list"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Output Schema (JSON, optional)</Label>
            <Textarea
              value={JSON.stringify(step.config.schema || {}, null, 2)}
              onChange={(e) => {
                try {
                  updateConfig("schema", JSON.parse(e.target.value));
                } catch {
                  // Ignore invalid JSON
                }
              }}
              placeholder='{"products": [{"name": "string", "price": "number"}]}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </>
      )}

      {step.type === "AI_ACTION" && (
        <div className="space-y-2">
          <Label>Action Description</Label>
          <Textarea
            value={(step.config.instruction as string) || ""}
            onChange={(e) => updateConfig("instruction", e.target.value)}
            placeholder="e.g., Fill out the signup form with realistic test data"
            rows={3}
          />
        </div>
      )}

      {step.type === "PRESS_KEY" && (
        <div className="space-y-2">
          <Label>Key to Press</Label>
          <Select
            value={(step.config.key as string) || "Enter"}
            onValueChange={(value) => updateConfig("key", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Enter">Enter</SelectItem>
              <SelectItem value="Escape">Escape</SelectItem>
              <SelectItem value="Tab">Tab</SelectItem>
              <SelectItem value="ArrowUp">Arrow Up</SelectItem>
              <SelectItem value="ArrowDown">Arrow Down</SelectItem>
              <SelectItem value="ArrowLeft">Arrow Left</SelectItem>
              <SelectItem value="ArrowRight">Arrow Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {step.type === "SCROLL" && (
        <>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select
              value={(step.config.direction as string) || "down"}
              onValueChange={(value) => updateConfig("direction", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="up">Up</SelectItem>
                <SelectItem value="down">Down</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (pixels)</Label>
            <Input
              type="number"
              value={(step.config.amount as number) || 300}
              onChange={(e) => updateConfig("amount", parseInt(e.target.value))}
            />
          </div>
        </>
      )}

      {step.type === "JAVASCRIPT" && (
        <div className="space-y-2">
          <Label>JavaScript Code</Label>
          <Textarea
            value={(step.config.code as string) || ""}
            onChange={(e) => updateConfig("code", e.target.value)}
            placeholder="// Return a value or throw an error\nreturn document.title;"
            rows={8}
            className="font-mono text-xs"
          />
        </div>
      )}

      {step.type === "SCREENSHOT" && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`fullPage-${step.id}`}
            checked={(step.config.fullPage as boolean) ?? false}
            onChange={(e) => updateConfig("fullPage", e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor={`fullPage-${step.id}`} className="text-sm font-normal">
            Capture full page
          </Label>
        </div>
      )}
    </div>
  );
}
