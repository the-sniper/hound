"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Camera,
  Terminal,
  Activity,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, formatDuration } from "@/lib/utils";

interface Run {
  id: string;
  status: string;
  environment: string;
  baseUrl: string;
  duration: number | null;
  failureAnalysis: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  test: {
    id: string;
    name: string;
  };
}

interface StepResult {
  id: string;
  status: string;
  duration: number | null;
  screenshotUrl: string | null;
  error: string | null;
  logs: unknown;
  aiResponse: unknown;
  step: {
    id: string;
    orderIndex: number;
    type: string;
    description: string;
    config: unknown;
  };
  createdAt: string;
}

interface RunEvent {
  type: "step_start" | "step_complete" | "step_error" | "run_complete";
  runId: string;
  stepId?: string;
  status?: string;
  screenshotUrl?: string;
  duration?: number;
  error?: string;
  timestamp: number;
}

export default function RunViewerPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const testId = params.testId as string;
  const runId = params.runId as string;

  const [run, setRun] = useState<Run | null>(null);
  const [results, setResults] = useState<StepResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<StepResult | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    loadRun();
    setupEventSource();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [runId]);

  async function loadRun() {
    setLoading(true);
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setRun(data.run);
        setResults(data.results);
        if (data.results.length > 0 && !selectedStep) {
          setSelectedStep(data.results[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load run:", error);
    }
    setLoading(false);
  }

  function setupEventSource() {
    const es = new EventSource(`/api/runs/${runId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: RunEvent = JSON.parse(event.data);

        if (data.type === "step_start") {
          setResults((prev) =>
            prev.map((r) =>
              r.step.id === data.stepId ? { ...r, status: "RUNNING" } : r
            )
          );
        } else if (data.type === "step_complete") {
          setResults((prev) =>
            prev.map((r) =>
              r.step.id === data.stepId
                ? {
                    ...r,
                    status: data.status || "PASSED",
                    screenshotUrl: data.screenshotUrl || r.screenshotUrl,
                    duration: data.duration || r.duration,
                  }
                : r
            )
          );
        } else if (data.type === "step_error") {
          setResults((prev) =>
            prev.map((r) =>
              r.step.id === data.stepId
                ? {
                    ...r,
                    status: "FAILED",
                    error: data.error || r.error,
                    screenshotUrl: data.screenshotUrl || r.screenshotUrl,
                    duration: data.duration || r.duration,
                  }
                : r
            )
          );
        } else if (data.type === "run_complete") {
          loadRun(); // Reload to get final state
          es.close();
        }
      } catch (error) {
        console.error("Failed to parse SSE event:", error);
      }
    };

    es.onerror = () => {
      console.error("SSE error");
      es.close();
    };
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PASSED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "RUNNING":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PASSED":
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "RUNNING":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case "PENDING":
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function getStepIcon(type: string) {
    const icons: Record<string, React.ReactNode> = {
      NAVIGATE: <ChevronRight className="h-4 w-4" />,
      CLICK: <div className="h-4 w-4 rounded-full border-2 border-current" />,
      TYPE: <div className="h-4 w-4 border border-current rounded" />,
      WAIT: <Clock className="h-4 w-4" />,
      ASSERT_TEXT: <CheckCircle className="h-4 w-4" />,
      ASSERT_ELEMENT: <CheckCircle className="h-4 w-4" />,
      AI_CHECK: <Sparkles className="h-4 w-4" />,
      AI_EXTRACT: <Sparkles className="h-4 w-4" />,
      AI_ACTION: <Sparkles className="h-4 w-4" />,
      SCREENSHOT: <Camera className="h-4 w-4" />,
      JAVASCRIPT: <Terminal className="h-4 w-4" />,
    };
    return icons[type] || <Activity className="h-4 w-4" />;
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

  if (!run) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Run not found</p>
        </div>
      </DashboardShell>
    );
  }

  const passedSteps = results.filter((r) => r.status === "PASSED").length;
  const failedSteps = results.filter((r) => r.status === "FAILED").length;
  const runningSteps = results.filter((r) => r.status === "RUNNING").length;

  return (
    <DashboardShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          Project
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/projects/${projectId}/tests`} className="hover:text-foreground">
          Tests
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/projects/${projectId}/tests/${testId}`}
          className="hover:text-foreground"
        >
          {run.test.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Run {runId.slice(-6)}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}/tests/${testId}`}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Test Run</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {getStatusBadge(run.status)}
              <span>•</span>
              <span>{formatDistanceToNow(run.createdAt)}</span>
              {run.duration && (
                <>
                  <span>•</span>
                  <span>{formatDuration(run.duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button onClick={loadRun} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            {passedSteps} passed, {failedSteps} failed, {runningSteps} running
          </span>
          <span className="font-medium">
            {results.length > 0
              ? Math.round(
                  ((passedSteps + failedSteps) / results.length) * 100
                )
              : 0}
            %
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all"
            style={{
              width: `${results.length ? (passedSteps / results.length) * 100 : 0}%`,
            }}
          />
          <div
            className="h-full bg-red-500 transition-all"
            style={{
              width: `${results.length ? (failedSteps / results.length) * 100 : 0}%`,
            }}
          />
          <div
            className="h-full bg-blue-500 transition-all"
            style={{
              width: `${results.length ? (runningSteps / results.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Step Timeline</TabsTrigger>
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          {run.failureAnalysis && (
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Step Execution</CardTitle>
                <CardDescription>
                  View each step and its execution status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="relative space-y-4 pl-4">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-4 bottom-4 w-px bg-gray-200" />

                    {results.map((result, index) => (
                      <div
                        key={result.id}
                        className={`relative flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedStep?.id === result.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedStep(result)}
                      >
                        {/* Step number dot */}
                        <div
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            result.status === "PASSED"
                              ? "border-green-500 bg-green-50"
                              : result.status === "FAILED"
                              ? "border-red-500 bg-red-50"
                              : result.status === "RUNNING"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 bg-gray-50"
                          }`}
                        >
                          <span className="text-xs font-medium">{index + 1}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getStepIcon(result.step.type)}
                              <span className="ml-1">{result.step.type}</span>
                            </Badge>
                            {result.duration && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(result.duration)}
                              </span>
                            )}
                          </div>
                          <p className="font-medium mt-1">{result.step.description}</p>
                          {result.error && (
                            <p className="text-sm text-red-600 mt-1 line-clamp-2">
                              {result.error}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0">
                          {getStatusIcon(result.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Step Details */}
            <Card>
              <CardHeader>
                <CardTitle>Step Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStep ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Type</p>
                      <Badge>{selectedStep.step.type}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="font-medium">{selectedStep.step.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      {getStatusBadge(selectedStep.status)}
                    </div>
                    {selectedStep.duration && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Duration</p>
                        <p>{formatDuration(selectedStep.duration)}</p>
                      </div>
                    )}
                    {selectedStep.error && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Error</p>
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                          {selectedStep.error}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Configuration</p>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                        {JSON.stringify(selectedStep.step.config, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select a step to view details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="screenshots">
          <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
            {/* Screenshot thumbnails */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Screenshots</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="space-y-2">
                    {results
                      .filter((r) => r.screenshotUrl)
                      .map((result, index) => (
                        <div
                          key={result.id}
                          className={`p-2 rounded border cursor-pointer transition-colors ${
                            selectedStep?.id === result.id
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedStep(result)}
                        >
                          <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
                            <Camera className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-xs truncate">Step {result.step.orderIndex + 1}</p>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Screenshot viewer */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedStep?.screenshotUrl
                    ? `Step ${selectedStep.step.orderIndex + 1}: ${selectedStep.step.description}`
                    : "Screenshot Viewer"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStep?.screenshotUrl ? (
                  <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      src={selectedStep.screenshotUrl}
                      alt={`Step ${selectedStep.step.orderIndex + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Camera className="h-12 w-12 mb-4" />
                    <p>
                      {selectedStep
                        ? "No screenshot available for this step"
                        : "Select a step to view screenshot"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Console & Network Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-350px)]">
                {results.map((result) => (
                  <div key={result.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Step {result.step.orderIndex + 1}</Badge>
                      <span className="text-sm font-medium">{result.step.type}</span>
                      {getStatusIcon(result.status)}
                    </div>
                    {result.logs ? (
                      <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded overflow-auto">
                        {JSON.stringify(result.logs, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No logs captured for this step
                      </p>
                    )}
                    <Separator className="mt-4" />
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {run.failureAnalysis && (
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Failure Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of test failures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-amber-800 font-medium mb-2">Analysis</h4>
                    <div className="text-amber-900 whitespace-pre-wrap">
                      {run.failureAnalysis}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </DashboardShell>
  );
}
