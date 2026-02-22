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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Play,
  MoreVertical,
  Edit,
  Trash2,
  FlaskConical,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Check,
  Loader2,
  History,
} from "lucide-react";
import { formatDistanceToNow, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Environment {
  id: string;
  name: string;
  isDefault: boolean;
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
  createdAt: string;
  _count: { steps: number; runs: number };
  runs: { id: string; status: string; createdAt: string }[];
  health: TestHealth;
}

interface Project {
  id: string;
  name: string;
  baseUrl: string;
}

export default function TestsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
  });
  const [deleteConfirmTest, setDeleteConfirmTest] = useState<Test | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<string>("");

  // Bulk operations state
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    loadData();
    loadEnvironments();
  }, [projectId]);

  async function loadEnvironments() {
    try {
      const res = await fetch(`/api/projects/${projectId}/environments`);
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data);
        const defaultEnv = data.find((e: Environment) => e.isDefault);
        if (defaultEnv) {
          setSelectedEnvironmentId(defaultEnv.id);
        }
      }
    } catch (error) {
      console.error("Failed to load environments:", error);
    }
  }

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredTests(
      tests.filter(
        (test) =>
          test.name.toLowerCase().includes(query) ||
          (test.description?.toLowerCase().includes(query) ?? false),
      ),
    );
  }, [tests, searchQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const [testsRes, projectRes] = await Promise.all([
        fetch(`/api/tests?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (testsRes.ok) {
        setTests(await testsRes.json());
      }
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTest.name,
          description: newTest.description || undefined,
          projectId,
          steps: [],
        }),
      });

      if (res.ok) {
        const test = await res.json();
        toast.success("Test created");
        setCreateDialogOpen(false);
        setNewTest({ name: "", description: "" });
        window.location.href = `/projects/${projectId}/tests/${test.id}`;
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create test");
      }
    } catch (error) {
      toast.error("Failed to create test");
    }
    setCreating(false);
  }

  async function handleRunTest(testId: string, envId?: string) {
    try {
      const body: {
        testId: string;
        projectId: string;
        environmentId?: string;
      } = {
        testId,
        projectId,
      };
      if (envId) {
        body.environmentId = envId;
      }

      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const run = await res.json();
        toast.success("Test run started");
        window.location.href = `/projects/${projectId}/tests/${testId}/runs/${run.id}`;
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start test run");
      }
    } catch (error) {
      toast.error("Failed to start test run");
    }
  }

  async function handleDeleteTest() {
    if (!deleteConfirmTest) return;

    try {
      const res = await fetch(`/api/tests/${deleteConfirmTest.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Test deleted");
        setTests((prev) => prev.filter((t) => t.id !== deleteConfirmTest.id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete test");
      }
    } catch (error) {
      toast.error("Failed to delete test");
    }
    setDeleteConfirmTest(null);
  }

  function toggleTestSelection(testId: string) {
    setSelectedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  }

  function selectAllTests() {
    if (selectedTests.size === filteredTests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(filteredTests.map((t) => t.id)));
    }
  }

  async function handleBulkRun() {
    if (selectedTests.size === 0) return;

    setBulkRunning(true);
    try {
      const res = await fetch("/api/tests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "run",
          testIds: Array.from(selectedTests),
          projectId,
          environmentId: selectedEnvironmentId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Started ${data.total} test runs`);
        setSelectedTests(new Set());
        setShowBulkActions(false);
        setTimeout(loadData, 2000);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to run tests");
      }
    } catch (error) {
      toast.error("Failed to run tests");
    }
    setBulkRunning(false);
  }

  async function handleBulkDelete() {
    if (selectedTests.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedTests.size} tests? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/tests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "delete",
          testIds: Array.from(selectedTests),
          projectId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Deleted ${data.successful} tests`);
        if (data.failed > 0) {
          toast.error(`Failed to delete ${data.failed} tests`);
        }
        setSelectedTests(new Set());
        setShowBulkActions(false);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete tests");
      }
    } catch (error) {
      toast.error("Failed to delete tests");
    }
    setBulkDeleting(false);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PASSED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "RUNNING":
        return <Clock className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground/50" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-500/10 text-green-700 border-green-500/20",
      DRAFT: "bg-muted text-muted-foreground border-border/50",
      PAUSED: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      ARCHIVED: "bg-red-500/10 text-red-700 border-red-500/20",
    };
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-bold text-[10px] tracking-[0.15em] uppercase px-3 py-1 rounded-lg backdrop-blur-sm shadow-sm transition-all duration-300",
          variants[status] || variants.DRAFT,
        )}
      >
        {status}
      </Badge>
    );
  }

  function getHealthColor(passRate: number | null): string {
    if (passRate === null) return "text-muted-foreground";
    if (passRate >= 90) return "text-green-600";
    if (passRate >= 70) return "text-amber-600";
    return "text-red-600";
  }

  function getHealthBgColor(passRate: number | null): string {
    if (passRate === null) return "bg-muted";
    if (passRate >= 90) return "bg-green-500/5";
    if (passRate >= 70) return "bg-amber-500/5";
    return "bg-red-500/5";
  }

  function getFlakinessColor(flakiness: number | null): string {
    if (flakiness === null) return "text-muted-foreground";
    if (flakiness === 0) return "text-green-700";
    if (flakiness <= 30) return "text-amber-700";
    return "text-red-700";
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      case "stable":
        return <Minus className="h-3 w-3 text-blue-600" />;
      default:
        return <Activity className="h-3 w-3 text-gray-400" />;
    }
  }

  function HealthIndicator({ health }: { health: TestHealth }) {
    if (!health || health.totalRuns === 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground/40">
          <Activity className="h-3 w-3" />
          <span>No activity</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-current/10 ${getHealthBgColor(health.passRate)} ${getHealthColor(health.passRate)}`}
            >
              {health.passRate !== null ? `${health.passRate}%` : "N/A"}
            </div>
          </TooltipTrigger>
          <TooltipContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
            <p className="text-xs font-semibold">
              Reliability: {health.passedRuns}/{health.totalRuns} passing
            </p>
          </TooltipContent>
        </Tooltip>

        {health.flakiness !== null && health.flakiness > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/5 border border-amber-500/10 ${getFlakinessColor(health.flakiness)}`}
              >
                <AlertCircle className="h-3 w-3" />
                {health.flakiness}% flaky
              </div>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
              <p className="text-xs font-semibold">
                Stability: {health.flakiness}% status variation
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background/50 border border-border/20">
              {getTrendIcon(health.trend)}
            </div>
          </TooltipTrigger>
          <TooltipContent className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-wider">
              Trend: {health.trend}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">Loading tests...</span>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <TooltipProvider>
      <DashboardShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link
              href="/projects"
              className="hover:text-foreground transition-colors font-medium"
            >
              Projects
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-foreground transition-colors font-medium"
            >
              {project?.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-semibold">Tests</span>
          </div>

          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div className="flex items-center gap-6">
              <Link href={`/projects/${projectId}`}>
                <Button
                  variant="outline"
                  size="icon"
                  className="group rounded-[1.25rem] h-14 w-14 border-border/40 bg-card/40 backdrop-blur-xl shadow-elegant hover:scale-105 active:scale-95 transition-all"
                >
                  <ChevronLeft className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
              </Link>
              <div>
                <h1 className="text-5xl font-display font-bold tracking-tight text-foreground">
                  Tests
                </h1>
                <p className="text-muted-foreground/60 font-medium text-lg mt-1">
                  Manage and monitor your test suites
                </p>
              </div>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl px-8 h-14 font-bold text-base shadow-elegant hover:scale-105 active:scale-95 transition-all">
                  <Plus className="mr-2.5 h-5 w-5" />
                  New Test
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-border/40 shadow-glass bg-card/90 backdrop-blur-2xl p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="font-display text-4xl font-bold tracking-tight">
                    Create Test
                  </DialogTitle>
                  <DialogDescription className="text-lg font-medium text-muted-foreground/60">
                    Architect a new test suite for {project?.name}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold">
                      Test Name
                    </Label>
                    <Input
                      id="name"
                      value={newTest.name}
                      onChange={(e) =>
                        setNewTest((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Login Flow Test"
                      required
                      className="rounded-xl h-12 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-semibold">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="description"
                      value={newTest.description}
                      onChange={(e) =>
                        setNewTest((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="What does this test verify?"
                      rows={3}
                      className="rounded-xl border-border/50"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={creating}
                      className="rounded-full px-6"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Test"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search & Bulk Actions */}
          <div className="flex items-center gap-6 mb-10">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search tests by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 rounded-2xl h-14 border-border/40 bg-card/40 backdrop-blur-xl shadow-elegant focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all text-lg font-medium"
              />
            </div>

            <Button
              variant={showBulkActions ? "secondary" : "outline"}
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`rounded-2xl px-6 h-14 font-bold text-sm tracking-widest uppercase transition-all duration-300 border-border/40 group ${showBulkActions ? "bg-primary text-primary-foreground border-primary" : "bg-card/40 hover:border-primary/30"}`}
            >
              <Check
                className={`h-4 w-4 mr-2.5 transition-transform duration-300 ${showBulkActions ? "scale-110" : "group-hover:scale-110"}`}
              />
              {showBulkActions ? "Done" : "Select"}
            </Button>
          </div>

          {/* Bulk Actions Toolbar */}
          {showBulkActions && selectedTests.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-[2.5rem] p-6 mb-10 shadow-elegant backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg">
                  {selectedTests.size}
                </div>
                <div>
                  <span className="font-bold text-lg text-foreground">
                    Test{selectedTests.size !== 1 ? "s" : ""} Selected
                  </span>
                  <p className="text-sm font-medium text-muted-foreground/60">
                    Choose actions to perform in bulk
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {environments.length > 0 && (
                  <div className="flex flex-col gap-1.5 mr-4">
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-1">
                      Target Environment
                    </span>
                    <select
                      value={selectedEnvironmentId}
                      onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                      className="text-sm font-bold border border-border/40 rounded-xl px-4 py-2.5 bg-background shadow-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Default Environment</option>
                      {environments.map((env) => (
                        <option key={env.id} value={env.id}>
                          {env.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleBulkRun}
                    disabled={bulkRunning}
                    className="rounded-2xl px-6 h-12 font-bold border-primary/20 bg-background/50 hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    {bulkRunning ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Selection
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="rounded-2xl px-6 h-12 font-bold shadow-lg shadow-red-500/10"
                  >
                    {bulkDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tests Grid */}
          {showBulkActions && filteredTests.length > 0 && (
            <div className="flex items-center gap-4 mb-8 ml-2">
              <button
                onClick={selectAllTests}
                className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-[0.5rem] border-2 transition-all duration-300 ${
                    selectedTests.size === filteredTests.length &&
                    filteredTests.length > 0
                      ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-border/60 group-hover:border-primary/40"
                  }`}
                >
                  {selectedTests.size === filteredTests.length &&
                    filteredTests.length > 0 && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                </div>
                {selectedTests.size === filteredTests.length &&
                filteredTests.length > 0
                  ? "Deselect All"
                  : `Select All Tests (${filteredTests.length})`}
              </button>
            </div>
          )}

          {filteredTests.length === 0 ? (
            <Card className="rounded-[2.5rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                  <FlaskConical className="h-10 w-10 text-primary/60" />
                </div>
                <p className="text-xl font-semibold mb-3">
                  {searchQuery ? "No tests match your search" : "No tests yet"}
                </p>
                <p className="text-muted-foreground mb-8 text-lg">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first test to start testing"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="rounded-full px-6 h-11 font-semibold shadow-lg shadow-primary/20"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Test
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredTests.map((test, i) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Card
                    className={`group relative rounded-[2.5rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40 hover:bg-card/60 hover:border-primary/30 transition-all duration-500 overflow-hidden ${selectedTests.has(test.id) ? "border-primary ring-4 ring-primary/10 bg-primary/[0.02]" : ""}`}
                  >
                    {selectedTests.has(test.id) && (
                      <div className="absolute top-0 right-0 p-4">
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                          {showBulkActions && (
                            <button
                              onClick={() => toggleTestSelection(test.id)}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                                selectedTests.has(test.id)
                                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                  : "border-border/60 hover:border-primary/40 bg-background/50"
                              }`}
                            >
                              {selectedTests.has(test.id) && (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <Link
                            href={`/projects/${projectId}/tests/${test.id}`}
                            className="flex-1 min-w-0"
                          >
                            <p className="font-bold text-2xl tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                              {test.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge
                                variant="outline"
                                className="rounded-lg bg-background/50 border-border/40 font-bold text-[10px] tracking-widest uppercase py-0.5"
                              >
                                {test._count.steps} steps
                              </Badge>
                            </div>
                          </Link>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl bg-background/50 border border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-all"
                            >
                              <MoreVertical className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-[1.5rem] border-border/40 bg-popover/90 backdrop-blur-xl p-2 min-w-[180px]"
                          >
                            <DropdownMenuItem
                              asChild
                              className="rounded-xl py-3 cursor-pointer"
                            >
                              <Link
                                href={`/projects/${projectId}/tests/${test.id}`}
                              >
                                <Edit className="mr-3 h-4 w-4" />
                                <span className="font-bold text-sm">
                                  Design Suite
                                </span>
                              </Link>
                            </DropdownMenuItem>
                            {environments.length > 0 ? (
                              <div className="relative group/run">
                                <DropdownMenuItem className="rounded-xl py-3 cursor-default flex justify-between">
                                  <div className="flex items-center">
                                    <Play className="mr-3 h-4 w-4" />
                                    <span className="font-bold text-sm">
                                      Run Pilot...
                                    </span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 opacity-40" />
                                </DropdownMenuItem>
                                <div className="absolute left-full top-0 ml-1 hidden group-hover/run:block z-50">
                                  <div className="rounded-[1.5rem] border border-border/40 bg-popover shadow-elegant p-2 min-w-[200px]">
                                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 mb-1">
                                      Select Environment
                                    </div>
                                    <div className="max-h-[200px] overflow-auto">
                                      <button
                                        onClick={() => handleRunTest(test.id)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/5 text-sm font-bold transition-all"
                                      >
                                        Default Runtime
                                      </button>
                                      {environments.map((env) => (
                                        <button
                                          key={env.id}
                                          onClick={() =>
                                            handleRunTest(test.id, env.id)
                                          }
                                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/5 text-sm font-bold transition-all border-t border-border/10"
                                        >
                                          {env.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleRunTest(test.id)}
                                className="rounded-xl py-3 cursor-pointer"
                              >
                                <Play className="mr-3 h-4 w-4" />
                                <span className="font-bold text-sm">
                                  Run pilot
                                </span>
                              </DropdownMenuItem>
                            )}
                            <div className="h-px bg-border/40 my-1 mx-2" />
                            <DropdownMenuItem
                              className="text-red-600 rounded-xl py-3 cursor-pointer focus:bg-red-50 focus:text-red-700"
                              onClick={() => setDeleteConfirmTest(test)}
                            >
                              <Trash2 className="mr-3 h-4 w-4" />
                              <span className="font-bold text-sm">
                                Decommission
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {test.description && (
                        <p className="text-base text-muted-foreground/80 mb-6 line-clamp-2 font-medium leading-relaxed min-h-[3rem]">
                          {test.description}
                        </p>
                      )}

                      <div className="pt-2">
                        <HealthIndicator health={test.health} />
                      </div>

                      {test.runs.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border/10">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-3 px-1">
                            Recent Reports
                          </p>
                          <div className="space-y-2">
                            {test.runs.slice(0, 3).map((run, idx) => (
                              <Link
                                key={idx}
                                href={`/projects/${projectId}/tests/${test.id}/runs/${run.id}`}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-background/30 border border-border/30 hover:border-primary/20 hover:bg-primary/[0.02] transition-all group/run"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      run.status === "PASSED"
                                        ? "bg-green-500"
                                        : run.status === "FAILED"
                                          ? "bg-red-500"
                                          : "bg-primary"
                                    }`}
                                  />
                                  <span className="text-[11px] font-bold text-muted-foreground group-hover/run:text-foreground transition-colors">
                                    {run.status}
                                  </span>
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground/60">
                                  {formatDistanceToNow(new Date(run.createdAt))}{" "}
                                  ago
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-6 border-t border-border/10 mt-6">
                        <div className="flex items-center gap-4">
                          {getStatusBadge(test.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 border border-border/40 shadow-sm">
                            <Activity className="h-3.5 w-3.5 opacity-40" />
                            <span className="uppercase tracking-widest">
                              {test._count.runs} runs
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={!!deleteConfirmTest}
            onOpenChange={() => setDeleteConfirmTest(null)}
          >
            <DialogContent className="rounded-[2rem] border-border/40 shadow-glass">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Delete Test
                </DialogTitle>
                <DialogDescription className="text-base">
                  Are you sure you want to delete &quot;
                  {deleteConfirmTest?.name}&quot;? This action cannot be undone.
                  All runs and data will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmTest(null)}
                  className="rounded-full px-6"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTest}
                  className="rounded-full px-6"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </DashboardShell>
    </TooltipProvider>
  );
}
