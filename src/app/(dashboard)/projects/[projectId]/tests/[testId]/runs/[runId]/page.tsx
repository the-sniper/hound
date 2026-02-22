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
  GitCompare,
  Eye,
  Zap,
  Video,
  Globe,
  AlertTriangle,
  Accessibility,
  Shield,
  BarChart3,
  GitBranch,
  UserPlus,
  MessageSquare,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
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
  videoUrl: string | null;
  harUrl: string | null;
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
  cacheHit?: boolean;
  retryCount?: number;
  step: {
    id: string;
    orderIndex: number;
    type: string;
    description: string;
    config: string | unknown;
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

interface ComparisonResult {
  stepId: string;
  stepIndex: number;
  stepDescription: string;
  hasBaseline: boolean;
  hasCurrent: boolean;
  baselineScreenshot?: string;
  currentScreenshot?: string;
  result?: {
    matched: boolean;
    diffPercentage: number;
    diffPixels: number;
    totalPixels: number;
    diffImagePath?: string;
  };
  error?: string;
}

interface ComparisonData {
  baselineRun: {
    id: string;
    status: string;
    createdAt: string;
  };
  currentRun: {
    id: string;
    status: string;
    testName: string;
    createdAt: string;
  };
  summary: {
    totalCompared: number;
    matchedCount: number;
    diffCount: number;
    averageDiffPercentage: number;
    hasSignificantChanges: boolean;
  };
  comparisons: ComparisonResult[];
}

interface BaselineRun {
  id: string;
  status: string;
  createdAt: string;
  _count: { results: number };
}

interface HarEntry {
  request: { method: string; url: string };
  response: { status: number; content: { size: number; mimeType: string } };
  time: number;
  timings: { wait: number; receive: number };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-green-600";
  if (status >= 300 && status < 400) return "text-yellow-600";
  return "text-red-600";
}

function getContentType(mimeType: string): string {
  if (mimeType.includes("json")) return "JSON";
  if (mimeType.includes("html")) return "HTML";
  if (mimeType.includes("css")) return "CSS";
  if (mimeType.includes("javascript")) return "JS";
  if (mimeType.includes("image")) return "Image";
  if (mimeType.includes("font")) return "Font";
  if (mimeType.includes("xml")) return "XML";
  return mimeType.split("/").pop()?.toUpperCase() || "Other";
}

// Screenshot thumbnail component with error handling
function ScreenshotThumbnail({
  result,
  isSelected,
  onClick,
}: {
  result: StepResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`p-2 rounded border cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-gray-200 hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      <div className="aspect-video bg-gray-100 rounded mb-2 overflow-hidden flex items-center justify-center">
        {hasError ? (
          <Camera className="h-6 w-6 text-gray-400" />
        ) : (
          <img
            src={result.screenshotUrl || ""}
            alt={`Step ${result.step.orderIndex + 1}`}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        )}
      </div>
      <p className="text-xs truncate">Step {result.step.orderIndex + 1}</p>
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";

// AI Thinking State Component
function AIThinkingIndicator() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">AI Analyzing Run</span>
    </motion.div>
  );
}

// Streaming AI Response Component
function StreamingAIResponse({ response }: { response: string }) {
  const [displayed, setDisplayed] = useState("");
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < response.length) {
        setDisplayed(response.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [response]);
  
  return (
    <div className="relative">
      <div className="text-sm leading-relaxed text-foreground/90 font-medium whitespace-pre-wrap">
        {displayed}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-1.5 h-4 bg-primary ml-1 align-middle"
        />
      </div>
    </div>
  );
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

  // Comparison state
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [baselineRuns, setBaselineRuns] = useState<BaselineRun[]>([]);
  const [selectedBaselineRunId, setSelectedBaselineRunId] = useState<string>("");
  const [comparing, setComparing] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState<ComparisonResult | null>(null);

  // Network HAR state
  const [harEntries, setHarEntries] = useState<HarEntry[]>([]);
  const [harLoading, setHarLoading] = useState(false);
  const [harLoaded, setHarLoaded] = useState(false);

  // Accessibility state
  const [a11yData, setA11yData] = useState<{ score: number; violations: any[]; summary: Record<string, number> } | null>(null);
  const [a11yLoading, setA11yLoading] = useState(false);

  // Performance state
  const [perfData, setPerfData] = useState<{ metrics: any[]; networkTimings: any[] } | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // Security state
  const [secData, setSecData] = useState<{ grade: string; findings: any[]; summary: Record<string, number> } | null>(null);
  const [secLoading, setSecLoading] = useState(false);

  // Correlate state
  const [correlateDialogOpen, setCorrelateDialogOpen] = useState(false);
  const [correlateInput, setCorrelateInput] = useState("");
  const [correlateResult, setCorrelateResult] = useState<any>(null);
  const [correlating, setCorrelating] = useState(false);

  // Assign state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    loadRun();
    setupEventSource();
    loadComments();

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
        console.log("Run data:", data);
        console.log("Results:", data.results);
        setRun(data);
        const resultsArray = data.results || [];
        setResults(resultsArray);
        if (resultsArray.length > 0 && !selectedStep) {
          setSelectedStep(resultsArray[0]);
        }
      } else {
        const error = await res.json();
        console.error("API error:", error);
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

  async function loadBaselineRuns() {
    try {
      const res = await fetch(`/api/runs/${runId}/compare`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBaselineRuns(data.baselineRuns);
        if (data.baselineRuns.length > 0 && !selectedBaselineRunId) {
          setSelectedBaselineRunId(data.baselineRuns[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load baseline runs:", error);
    }
  }

  async function compareWithBaseline() {
    if (!selectedBaselineRunId) return;

    setComparing(true);
    try {
      const res = await fetch(
        `/api/runs/${runId}/compare?baselineRunId=${selectedBaselineRunId}`
      );
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
        if (data.comparisons.length > 0) {
          setSelectedComparison(data.comparisons[0]);
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to compare runs");
      }
    } catch (error) {
      console.error("Comparison failed:", error);
      alert("Failed to compare runs");
    }
    setComparing(false);
  }

  async function loadHarData() {
    if (harLoaded || harLoading) return;
    setHarLoading(true);
    try {
      const res = await fetch(`/api/runs/${runId}/har`);
      if (res.ok) {
        const data = await res.json();
        setHarEntries(data?.log?.entries || []);
      }
    } catch (error) {
      console.error("Failed to load HAR data:", error);
    }
    setHarLoading(false);
    setHarLoaded(true);
  }

  async function loadAccessibility() {
    if (a11yData || a11yLoading) return;
    setA11yLoading(true);
    try {
      const res = await fetch(`/api/runs/${runId}/accessibility`);
      if (res.ok) {
        const data = await res.json();
        const violations = data.violations || data.results || [];
        const summary: Record<string, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        violations.forEach((v: any) => {
          const impact = v.impact?.toLowerCase() || "minor";
          if (summary[impact] !== undefined) summary[impact]++;
        });
        setA11yData({ score: data.score ?? data.accessibilityScore ?? 0, violations, summary });
      }
    } catch (error) {
      console.error("Failed to load accessibility data:", error);
    }
    setA11yLoading(false);
  }

  async function loadPerformance() {
    if (perfData || perfLoading) return;
    setPerfLoading(true);
    try {
      const res = await fetch(`/api/runs/${runId}/performance`);
      if (res.ok) {
        const data = await res.json();
        setPerfData({
          metrics: data.metrics || data || [],
          networkTimings: data.networkTimings || [],
        });
      }
    } catch (error) {
      console.error("Failed to load performance data:", error);
    }
    setPerfLoading(false);
  }

  async function loadSecurity() {
    if (secData || secLoading) return;
    setSecLoading(true);
    try {
      const res = await fetch(`/api/runs/${runId}/security`);
      if (res.ok) {
        const data = await res.json();
        const findings = data.findings || data || [];
        const summary: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        findings.forEach((f: any) => {
          const sev = f.severity?.toLowerCase() || "info";
          if (summary[sev] !== undefined) summary[sev]++;
        });
        setSecData({ grade: data.grade || data.securityGrade || "N/A", findings, summary });
      }
    } catch (error) {
      console.error("Failed to load security data:", error);
    }
    setSecLoading(false);
  }

  async function handleCorrelate() {
    setCorrelating(true);
    try {
      const res = await fetch(`/api/runs/${runId}/correlate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff: correlateInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setCorrelateResult(data);
      } else {
        console.error("Correlation failed");
      }
    } catch {
      console.error("Correlation failed");
    }
    setCorrelating(false);
  }

  async function handleAssign() {
    setAssigning(true);
    try {
      const res = await fetch(`/api/runs/${runId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee, note: assignNote }),
      });
      if (res.ok) {
        setAssignDialogOpen(false);
        setAssignee("");
        setAssignNote("");
      }
    } catch {
      console.error("Assignment failed");
    }
    setAssigning(false);
  }

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments?targetType=run&targetId=${runId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || data || []);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
    setCommentsLoading(false);
  }

  async function handlePostComment() {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment, targetType: "run", targetId: runId }),
      });
      if (res.ok) {
        setNewComment("");
        await loadComments();
      }
    } catch {
      console.error("Failed to post comment");
    }
    setPostingComment(false);
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <Link href={`/projects/${projectId}/tests/${testId}`}>
            <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 border-border/50 hover:bg-primary/5 hover:text-primary transition-all">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-display font-normal tracking-tight">Test Run</h1>
              {run.status === "RUNNING" && <AIThinkingIndicator />}
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              {getStatusBadge(run.status)}
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 opacity-50" />
                <span>{formatDistanceToNow(run.createdAt)}</span>
              </div>
              {run.duration && (
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 opacity-50" />
                  <span>{formatDuration(run.duration)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button onClick={loadRun} variant="outline" className="rounded-full h-12 px-6 border-border/50 font-semibold hover:bg-primary/5 hover:text-primary transition-all">
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
          {run.videoUrl && (
            <TabsTrigger value="video">
              <Video className="h-4 w-4 mr-1" />
              Video
            </TabsTrigger>
          )}
          {run.harUrl && (
            <TabsTrigger value="network" onClick={loadHarData}>
              <Globe className="h-4 w-4 mr-1" />
              Network
            </TabsTrigger>
          )}
          <TabsTrigger value="accessibility" onClick={loadAccessibility}>
            <Accessibility className="h-4 w-4 mr-1" />
            A11y
          </TabsTrigger>
          <TabsTrigger value="performance" onClick={loadPerformance}>
            <BarChart3 className="h-4 w-4 mr-1" />
            Perf
          </TabsTrigger>
          <TabsTrigger value="security" onClick={loadSecurity}>
            <Shield className="h-4 w-4 mr-1" />
            Security
          </TabsTrigger>
          <TabsTrigger value="compare" onClick={loadBaselineRuns}>
            <GitCompare className="h-4 w-4 mr-1" />
            Compare
          </TabsTrigger>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getStepIcon(result.step.type)}
                              <span className="ml-1">{result.step.type}</span>
                            </Badge>
                            {result.duration && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(result.duration)}
                              </span>
                            )}
                            {result.cacheHit && (
                              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0 gap-1">
                                <Zap className="h-3 w-3" />
                                Cached
                              </Badge>
                            )}
                            {(result.retryCount ?? 0) > 0 && (
                              <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] px-1.5 py-0 gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Retried &times;{result.retryCount}
                              </Badge>
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
                        <ScreenshotThumbnail
                          key={result.id}
                          result={result}
                          isSelected={selectedStep?.id === result.id}
                          onClick={() => setSelectedStep(result)}
                        />
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

        {run.videoUrl && (
          <TabsContent value="video">
            <Card className="border-border/50 shadow-elegant rounded-[2rem] overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Run Recording
                </CardTitle>
                <CardDescription>
                  Full video recording of the test execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl overflow-hidden bg-black/5 border border-border/30">
                  <video
                    controls
                    className="w-full rounded-lg"
                    src={run.videoUrl}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {run.harUrl && (
          <TabsContent value="network">
            <Card className="border-border/50 shadow-elegant rounded-[2rem] overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Network Requests
                </CardTitle>
                <CardDescription>
                  HTTP request waterfall captured during the run
                </CardDescription>
              </CardHeader>
              <CardContent>
                {harLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : harEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Globe className="h-12 w-12 mb-4 opacity-40" />
                    <p>No network requests captured</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-muted/50 border border-border/30 rounded-xl p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Requests</p>
                        <p className="text-xl font-semibold mt-1">{harEntries.length}</p>
                      </div>
                      <div className="bg-muted/50 border border-border/30 rounded-xl p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Total Size</p>
                        <p className="text-xl font-semibold mt-1">
                          {formatBytes(harEntries.reduce((acc, e) => acc + (e.response.content.size || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-muted/50 border border-border/30 rounded-xl p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Total Time</p>
                        <p className="text-xl font-semibold mt-1">
                          {formatMs(harEntries.reduce((acc, e) => acc + (e.time || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-muted/50 border border-border/30 rounded-xl p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Slow (&gt;1s)</p>
                        <p className="text-xl font-semibold mt-1 text-orange-600">
                          {harEntries.filter((e) => e.time > 1000).length}
                        </p>
                      </div>
                    </div>

                    {/* Request table */}
                    <ScrollArea className="h-[calc(100vh-480px)]">
                      <div className="rounded-xl border border-border/30 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border/30">
                              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-[70px]">Method</th>
                              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">URL</th>
                              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-[70px]">Status</th>
                              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-[70px]">Type</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-[80px]">Size</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-[90px]">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {harEntries.map((entry, i) => {
                              const isSlow = entry.time > 1000;
                              const urlObj = (() => { try { return new URL(entry.request.url); } catch { return null; } })();
                              const displayUrl = urlObj ? urlObj.pathname + urlObj.search : entry.request.url;
                              return (
                                <tr
                                  key={i}
                                  className={`border-b border-border/10 transition-colors hover:bg-muted/30 ${isSlow ? "bg-orange-50/50" : ""}`}
                                >
                                  <td className="px-4 py-2">
                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                                      {entry.request.method}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 font-mono text-xs truncate max-w-[400px]" title={entry.request.url}>
                                    {displayUrl}
                                  </td>
                                  <td className={`px-4 py-2 font-semibold ${getStatusColor(entry.response.status)}`}>
                                    {entry.response.status}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground">
                                    {getContentType(entry.response.content.mimeType)}
                                  </td>
                                  <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                                    {formatBytes(entry.response.content.size || 0)}
                                  </td>
                                  <td className="px-4 py-2 text-right tabular-nums">
                                    <span className={`text-xs ${isSlow ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
                                      {isSlow && <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />}
                                      {formatMs(entry.time)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {run.failureAnalysis && (
          <TabsContent value="analysis">
            <Card className="border-primary/20 shadow-elegant rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                <CardTitle className="flex items-center gap-3 text-2xl font-display font-normal tracking-tight text-primary">
                  <Sparkles className="h-6 w-6" />
                  AI Failure Analysis
                </CardTitle>
                <CardDescription className="text-primary/60 font-medium">
                  Intelligent diagnostics and recommendations for this failure
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/10 rounded-full" />
                  <StreamingAIResponse response={run.failureAnalysis} />
                </div>
                
                <div className="mt-10 flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/50">
                  <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Recommendation</p>
                    <p className="text-sm font-semibold text-foreground/80">Check the element locator in Step 4</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="compare">
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            {/* Comparison Controls & Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  Compare Runs
                </CardTitle>
                <CardDescription>
                  Compare screenshots with a baseline run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Baseline Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Baseline Run</label>
                  <select
                    value={selectedBaselineRunId}
                    onChange={(e) => setSelectedBaselineRunId(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="">Select a baseline run...</option>
                    {baselineRuns.map((run) => (
                      <option key={run.id} value={run.id}>
                        Run {run.id.slice(-6)} - {new Date(run.createdAt).toLocaleString()} ({run._count.results} steps)
                      </option>
                    ))}
                  </select>
                  {baselineRuns.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No valid baseline runs found. Baseline runs must have passed status and contain screenshots.
                    </p>
                  )}
                </div>

                <Button
                  onClick={compareWithBaseline}
                  disabled={!selectedBaselineRunId || comparing}
                  className="w-full"
                >
                  {comparing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GitCompare className="mr-2 h-4 w-4" />
                  )}
                  {comparing ? "Comparing..." : "Compare"}
                </Button>

                {/* Summary */}
                {comparisonData && (
                  <div className="pt-4 border-t space-y-3">
                    <h4 className="font-medium">Comparison Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-muted-foreground">Compared:</span>
                        <p className="font-medium">{comparisonData.summary.totalCompared}</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <span className="text-green-600">Matched:</span>
                        <p className="font-medium text-green-700">{comparisonData.summary.matchedCount}</p>
                      </div>
                      <div className="bg-red-50 p-2 rounded">
                        <span className="text-red-600">Differences:</span>
                        <p className="font-medium text-red-700">{comparisonData.summary.diffCount}</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="text-blue-600">Avg Diff:</span>
                        <p className="font-medium text-blue-700">{comparisonData.summary.averageDiffPercentage.toFixed(2)}%</p>
                      </div>
                    </div>
                    {comparisonData.summary.hasSignificantChanges && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-800">
                        Significant visual changes detected!
                      </div>
                    )}
                  </div>
                )}

                {/* Step List */}
                {comparisonData && comparisonData.comparisons.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Step Comparisons</h4>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1">
                        {comparisonData.comparisons.map((comp) => (
                          <div
                            key={comp.stepId}
                            onClick={() => setSelectedComparison(comp)}
                            className={`p-2 rounded cursor-pointer text-sm ${
                              selectedComparison?.stepId === comp.stepId
                                ? "bg-primary/10 border border-primary"
                                : "hover:bg-gray-50 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Step {comp.stepIndex}</span>
                              {comp.result ? (
                                comp.result.matched ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )
                              ) : comp.error ? (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              ) : (
                                <span className="text-xs text-muted-foreground">No baseline</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {comp.stepDescription}
                            </p>
                            {comp.result && !comp.result.matched && (
                              <p className="text-xs text-red-600">
                                {comp.result.diffPercentage.toFixed(2)}% different
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comparison Viewer */}
            <Card>
              <CardHeader>
                <CardTitle>Screenshot Comparison</CardTitle>
                {selectedComparison && (
                  <CardDescription>
                    Step {selectedComparison.stepIndex}: {selectedComparison.stepDescription}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!selectedComparison ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <GitCompare className="h-12 w-12 mb-4" />
                    <p>Select a baseline run and click Compare to start</p>
                  </div>
                ) : !selectedComparison.hasBaseline ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Camera className="h-12 w-12 mb-4" />
                    <p>No baseline screenshot available for this step</p>
                  </div>
                ) : selectedComparison.error ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-amber-600">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <p>{selectedComparison.error}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Baseline */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-center">Baseline</p>
                        {selectedComparison.baselineScreenshot && (
                          <div className="bg-gray-50 rounded-lg overflow-hidden border">
                            <img
                              src={selectedComparison.baselineScreenshot}
                              alt="Baseline"
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>

                      {/* Current */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-center">Current</p>
                        {selectedComparison.currentScreenshot && (
                          <div className="bg-gray-50 rounded-lg overflow-hidden border">
                            <img
                              src={selectedComparison.currentScreenshot}
                              alt="Current"
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>

                      {/* Diff */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-center">
                          Diff
                          {selectedComparison.result && (
                            <span className={`ml-2 text-xs ${
                              selectedComparison.result.matched ? "text-green-600" : "text-red-600"
                            }`}>
                              ({selectedComparison.result.diffPercentage.toFixed(2)}%)
                            </span>
                          )}
                        </p>
                        {selectedComparison.result?.diffImagePath ? (
                          <div className="bg-gray-50 rounded-lg overflow-hidden border border-red-200">
                            <img
                              src={selectedComparison.result.diffImagePath}
                              alt="Diff"
                              className="w-full h-auto"
                            />
                          </div>
                        ) : selectedComparison.result?.matched ? (
                          <div className="h-32 bg-green-50 rounded-lg border border-green-200 flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                        ) : (
                          <div className="h-32 bg-gray-50 rounded-lg border flex items-center justify-center text-muted-foreground">
                            No diff available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Diff Stats */}
                    {selectedComparison.result && (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className={`font-medium ${
                              selectedComparison.result.matched ? "text-green-600" : "text-red-600"
                            }`}>
                              {selectedComparison.result.matched ? "Matched" : "Different"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Diff Pixels</p>
                            <p className="font-medium">{selectedComparison.result.diffPixels.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Pixels</p>
                            <p className="font-medium">{selectedComparison.result.totalPixels.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* Accessibility Tab */}
        <TabsContent value="accessibility">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Accessibility Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a11yLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : a11yData ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className={`text-5xl font-display font-bold ${
                      a11yData.score > 80 ? "text-green-600" : a11yData.score > 50 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {a11yData.score}
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">Accessibility Score</p>
                      <p className="text-sm text-muted-foreground">
                        {a11yData.score > 80 ? "Good compliance" : a11yData.score > 50 ? "Needs improvement" : "Significant issues found"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {(["critical", "serious", "moderate", "minor"] as const).map((impact) => (
                      <Card key={impact} className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{impact}</p>
                        <p className={`text-2xl font-bold ${
                          impact === "critical" ? "text-red-600" : impact === "serious" ? "text-orange-600" : impact === "moderate" ? "text-yellow-600" : "text-blue-600"
                        }`}>{a11yData.summary[impact] || 0}</p>
                      </Card>
                    ))}
                  </div>

                  {a11yData.violations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-muted-foreground">Violations ({a11yData.violations.length})</p>
                      <div className="rounded-xl border border-border/40 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Rule</th>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Impact</th>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">WCAG</th>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Target</th>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a11yData.violations.map((v: any, i: number) => (
                              <tr key={i} className="border-t border-border/30">
                                <td className="p-3 font-mono text-xs">{v.ruleId || v.id}</td>
                                <td className="p-3">
                                  <Badge variant="outline" className={`text-[10px] ${
                                    v.impact === "critical" ? "border-red-500 text-red-600" :
                                    v.impact === "serious" ? "border-orange-500 text-orange-600" :
                                    v.impact === "moderate" ? "border-yellow-500 text-yellow-600" :
                                    "border-blue-500 text-blue-600"
                                  }`}>{v.impact}</Badge>
                                </td>
                                <td className="p-3 text-xs">{v.wcagCriteria || v.tags?.join(", ") || "-"}</td>
                                <td className="p-3 font-mono text-xs max-w-[200px] truncate">{v.target || v.nodes?.[0]?.target?.[0] || "-"}</td>
                                <td className="p-3 text-xs max-w-[300px] truncate">{v.description || v.help}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No accessibility data available for this run</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {perfLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : perfData && perfData.metrics.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {(Array.isArray(perfData.metrics) ? perfData.metrics : []).map((m: any, i: number) => (
                      <Card key={i} className={`p-4 ${m.overBudget ? "border-red-500/50 bg-red-500/5" : ""}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{m.name}</p>
                        <p className={`text-2xl font-bold ${m.overBudget ? "text-red-600" : "text-foreground"}`}>
                          {m.name === "CLS" ? m.value?.toFixed(3) : `${Math.round(m.value || 0)}${m.unit || "ms"}`}
                        </p>
                        {m.budgetMax != null && (
                          <p className={`text-[10px] font-bold ${m.overBudget ? "text-red-500" : "text-green-500"}`}>
                            Budget: {m.name === "CLS" ? m.budgetMax?.toFixed(2) : `${m.budgetMax}${m.unit || "ms"}`}
                            {m.overBudget && " — EXCEEDED"}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>

                  {perfData.networkTimings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-muted-foreground">Network Timing Breakdown</p>
                      <div className="grid grid-cols-5 gap-4">
                        {perfData.networkTimings.map((t: any, i: number) => (
                          <Card key={i} className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{t.name}</p>
                            <p className="text-lg font-bold">{Math.round(t.value)}ms</p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No performance data available for this run</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {secLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : secData ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className={`text-5xl font-display font-bold ${
                      secData.grade === "A" ? "text-green-600" :
                      secData.grade === "B" ? "text-lime-600" :
                      secData.grade === "C" ? "text-yellow-600" :
                      secData.grade === "D" ? "text-orange-600" :
                      "text-red-600"
                    }`}>
                      {secData.grade}
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">Security Grade</p>
                      <p className="text-sm text-muted-foreground">{secData.findings.length} findings total</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    {(["critical", "high", "medium", "low", "info"] as const).map((sev) => (
                      <Card key={sev} className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{sev}</p>
                        <p className={`text-2xl font-bold ${
                          sev === "critical" ? "text-red-600" : sev === "high" ? "text-orange-600" : sev === "medium" ? "text-yellow-600" : sev === "low" ? "text-blue-600" : "text-gray-500"
                        }`}>{secData.summary[sev] || 0}</p>
                      </Card>
                    ))}
                  </div>

                  {secData.findings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-muted-foreground">Findings ({secData.findings.length})</p>
                      <div className="rounded-xl border border-border/40 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Severity</th>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Type</th>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Title</th>
                              <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Remediation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {secData.findings.map((f: any, i: number) => (
                              <tr key={i} className="border-t border-border/30">
                                <td className="p-3">
                                  <Badge variant="outline" className={`text-[10px] ${
                                    f.severity === "critical" ? "border-red-500 text-red-600" :
                                    f.severity === "high" ? "border-orange-500 text-orange-600" :
                                    f.severity === "medium" ? "border-yellow-500 text-yellow-600" :
                                    "border-blue-500 text-blue-600"
                                  }`}>{f.severity}</Badge>
                                </td>
                                <td className="p-3 text-xs font-mono">{f.type}</td>
                                <td className="p-3 text-xs font-medium">{f.title}</td>
                                <td className="p-3 text-xs max-w-[300px] truncate">{f.remediation || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No security data available for this run</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons for failed runs */}
      {run && (run.status === "FAILED" || run.status === "ERROR") && (
        <div className="flex items-center gap-3 mt-6">
          <Dialog open={correlateDialogOpen} onOpenChange={setCorrelateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <GitBranch className="mr-2 h-4 w-4" />
                Correlate with Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[2rem] border-border/40 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle>Correlate Failure with Code Changes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Git Diff</Label>
                  <Textarea
                    value={correlateInput}
                    onChange={(e) => setCorrelateInput(e.target.value)}
                    placeholder="Paste your git diff here..."
                    rows={10}
                    className="font-mono text-xs"
                  />
                </div>
                <Button onClick={handleCorrelate} disabled={correlating || !correlateInput.trim()}>
                  {correlating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Analyze
                </Button>
                {correlateResult && (
                  <Card className="p-4 mt-4">
                    <p className="text-sm font-bold mb-2">Probable Cause</p>
                    <p className="text-sm">{correlateResult.analysis || correlateResult.probableCause || JSON.stringify(correlateResult)}</p>
                    {correlateResult.file && (
                      <p className="text-xs font-mono mt-2 text-muted-foreground">
                        {correlateResult.file}:{correlateResult.line} (confidence: {correlateResult.confidence || "N/A"})
                      </p>
                    )}
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <UserPlus className="mr-2 h-4 w-4" />
                Assign
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border-border/40 bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle>Assign Failure</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Input
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Team member name or email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    placeholder="Add context about the failure..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleAssign} disabled={assigning || !assignee.trim()}>
                  {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Assign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Comments Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            Comments
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadComments} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <div key={c.id} className="p-3 rounded-xl border border-border/40 bg-background/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{c.user?.name || c.user?.email || "Unknown"}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
          )}
          <div className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePostComment()}
            />
            <Button onClick={handlePostComment} disabled={postingComment || !newComment.trim()} size="icon" className="rounded-xl shrink-0">
              {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
