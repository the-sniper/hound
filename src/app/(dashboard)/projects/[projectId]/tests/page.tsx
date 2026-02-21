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
  runs: { status: string; createdAt: string }[];
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
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>("");

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
          (test.description?.toLowerCase().includes(query) ?? false)
      )
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
      const body: { testId: string; projectId: string; environmentId?: string } = {
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

    if (!confirm(`Are you sure you want to delete ${selectedTests.size} tests? This cannot be undone.`)) {
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
      ACTIVE: "bg-green-500/10 text-green-700 border-green-200/50",
      DRAFT: "bg-muted text-muted-foreground border-border/50",
      PAUSED: "bg-amber-500/10 text-amber-700 border-amber-200/50",
      ARCHIVED: "bg-red-500/10 text-red-700 border-red-200/50",
    };
    return (
      <Badge variant="outline" className={cn("font-semibold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full shadow-none", variants[status] || variants.DRAFT)}>{status}</Badge>
    );
  }

  function getHealthColor(passRate: number | null): string {
    if (passRate === null) return "text-muted-foreground";
    if (passRate >= 90) return "text-green-700";
    if (passRate >= 70) return "text-amber-700";
    return "text-red-700";
  }

  function getHealthBgColor(passRate: number | null): string {
    if (passRate === null) return "bg-muted";
    if (passRate >= 90) return "bg-green-500/10";
    if (passRate >= 70) return "bg-amber-500/10";
    return "bg-red-500/10";
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
    if (health.totalRuns === 0) {
      return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>No runs yet</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${getHealthBgColor(health.passRate)} ${getHealthColor(health.passRate)}`}>
              {health.passRate !== null ? `${health.passRate}%` : "N/A"}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pass rate: {health.passedRuns}/{health.totalRuns} runs</p>
          </TooltipContent>
        </Tooltip>

        {health.flakiness !== null && health.flakiness > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-orange-100 ${getFlakinessColor(health.flakiness)}`}>
                <AlertCircle className="h-3 w-3" />
                {health.flakiness}% flaky
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Flakiness: {health.flakiness}% status changes between runs</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getTrendIcon(health.trend)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Trend: {health.trend}</p>
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
          <Link href="/projects" className="hover:text-foreground transition-colors font-medium">
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors font-medium">
            {project?.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-semibold">Tests</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline" size="icon" className="rounded-full h-11 w-11 border-border/50">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-4xl font-display font-normal tracking-tight">Tests</h1>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full px-6 h-11 font-semibold shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                New Test
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border-border/40 shadow-glass">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Create Test</DialogTitle>
                <DialogDescription className="text-base">
                  Create a new test for {project?.name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold">Test Name</Label>
                  <Input
                    id="name"
                    value={newTest.name}
                    onChange={(e) =>
                      setNewTest((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Login Flow Test"
                    required
                    className="rounded-xl h-12 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-semibold">Description (optional)</Label>
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
                  <Button type="submit" disabled={creating} className="rounded-full px-6">
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : "Create Test"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Bulk Actions */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 rounded-full h-12 border-border/50 bg-card/40 shadow-sm"
            />
          </div>

          <Button
            variant={showBulkActions ? "secondary" : "outline"}
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="rounded-full px-4 h-12 font-medium border-border/50"
          >
            <Check className="h-4 w-4 mr-2" />
            {showBulkActions ? "Done" : "Select"}
          </Button>
        </div>

        {/* Bulk Actions Toolbar */}
        {showBulkActions && selectedTests.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-[2rem] p-4 mb-6"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {selectedTests.size} test{selectedTests.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {environments.length > 0 && (
                <select
                  value={selectedEnvironmentId}
                  onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                  className="text-sm border border-border/50 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">No environment</option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRun}
                disabled={bulkRunning}
                className="rounded-full"
              >
                {bulkRunning ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Run All
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="rounded-full"
              >
                {bulkDeleting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </motion.div>
        )}

        {/* Tests Grid */}
        {showBulkActions && filteredTests.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={selectAllTests}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium"
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-colors ${
                selectedTests.size === filteredTests.length && filteredTests.length > 0
                  ? "bg-primary border-primary text-white"
                  : "border-border"
              }`}>
                {selectedTests.size === filteredTests.length && filteredTests.length > 0 && (
                  <Check className="h-3 w-3" />
                )}
              </div>
              {selectedTests.size === filteredTests.length && filteredTests.length > 0
                ? "Deselect All"
                : `Select All (${filteredTests.length})`}
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
                <Button onClick={() => setCreateDialogOpen(true)} className="rounded-full px-6 h-11 font-semibold shadow-lg shadow-primary/20">
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
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className={`group rounded-[2rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40 hover:bg-card/60 hover:border-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${selectedTests.has(test.id) ? "border-primary ring-2 ring-primary/20" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {showBulkActions && (
                          <button
                            onClick={() => toggleTestSelection(test.id)}
                            className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-colors ${
                              selectedTests.has(test.id)
                                ? "bg-primary border-primary text-white"
                                : "border-border hover:border-primary"
                            }`}
                          >
                            {selectedTests.has(test.id) && <Check className="h-3 w-3" />}
                          </button>
                        )}
                        <Link
                          href={`/projects/${projectId}/tests/${test.id}`}
                          className="flex-1 min-w-0"
                        >
                          <p className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                            {test.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {test._count.steps} steps
                          </p>
                        </Link>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${projectId}/tests/${test.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {environments.length > 0 ? (
                            <DropdownMenuItem asChild>
                              <div className="relative">
                                <select
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  value={selectedEnvironmentId}
                                  onChange={(e) => {
                                    handleRunTest(test.id, e.target.value || undefined);
                                  }}
                                >
                                  <option value="">Default (no env)</option>
                                  {environments.map((env) => (
                                    <option key={env.id} value={env.id}>
                                      Run with: {env.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center">
                                  <Play className="mr-2 h-4 w-4" />
                                  <span>Run Test...</span>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleRunTest(test.id)}>
                              <Play className="mr-2 h-4 w-4" />
                              Run Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteConfirmTest(test)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {test.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {test.description}
                      </p>
                    )}

                    <div className="pt-3">
                      <HealthIndicator health={test.health} />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(test.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {test.runs.length > 0 && (
                          <>
                            {getStatusIcon(test.runs[0].status)}
                            <span>
                              {formatDistanceToNow(test.runs[0].createdAt)}
                            </span>
                          </>
                        )}
                        <span className="text-border">•</span>
                        <span>{test._count.runs} runs</span>
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
              <DialogTitle className="font-display text-2xl">Delete Test</DialogTitle>
              <DialogDescription className="text-base">
                Are you sure you want to delete &quot;{deleteConfirmTest?.name}&quot;? This
                action cannot be undone. All runs and data will be permanently
                deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmTest(null)} className="rounded-full px-6">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTest} className="rounded-full px-6">
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
